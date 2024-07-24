import { Block, PublicClient } from "viem";

import {
    TimestampNotFound,
    UnsupportedBlockNumber,
    UnsupportedBlockTimestamps,
} from "../exceptions/index.js";
import logger from "../utils/logger.js";
import { BlockNumberProvider } from "./blockNumberProvider.js";

const BINARY_SEARCH_DELTA_MULTIPLIER = 2n;

type BlockWithNumber = Omit<Block, "number"> & { number: bigint };

export class EvmBlockNumberProvider implements BlockNumberProvider {
    client: PublicClient;

    constructor(client: PublicClient) {
        this.client = client;
    }

    async getEpochBlockNumber(
        timestamp: number,
        searchParams: { blocksLookback: bigint },
    ): Promise<bigint> {
        const _timestamp = BigInt(timestamp);
        const upperBoundBlock = await this.client.getBlock({ blockTag: "finalized" });

        this.validateBlockNumber(upperBoundBlock);

        logger.info(
            `Working with latest block (number: ${upperBoundBlock.number}, timestamp: ${upperBoundBlock.timestamp})...`,
        );

        if (_timestamp >= upperBoundBlock.timestamp) return upperBoundBlock.number;

        const lowerBoundBlock = await this.calculateLowerBoundBlock(
            _timestamp,
            upperBoundBlock,
            searchParams.blocksLookback,
        );

        return this.searchTimestamp(_timestamp, {
            fromBlock: lowerBoundBlock.number,
            toBlock: upperBoundBlock.number,
        });
    }

    private validateBlockNumber(block: Block): block is BlockWithNumber {
        if (block.number === null) throw new UnsupportedBlockNumber(block.timestamp);

        return true;
    }

    private async calculateLowerBoundBlock(
        timestamp: bigint,
        lastBlock: BlockWithNumber,
        blocksLookback: bigint = 10_000n,
    ) {
        const estimatedBlockTime = await this.estimateBlockTime(lastBlock, blocksLookback);
        const timestampDelta = lastBlock.timestamp - timestamp;
        let candidateBlockNumber = lastBlock.number - timestampDelta / estimatedBlockTime;

        const baseStep = (lastBlock.number - candidateBlockNumber) * BINARY_SEARCH_DELTA_MULTIPLIER;

        logger.info("Calculating lower bound for binary search...");

        let searchCount = 0n;
        while (candidateBlockNumber >= 0) {
            const candidate = await this.client.getBlock({ blockNumber: candidateBlockNumber });

            if (candidate.timestamp < timestamp) {
                logger.info(`Estimated lower bound at block ${candidate.number}.`);

                return candidate;
            }

            searchCount++;
            candidateBlockNumber = lastBlock.number - baseStep * 2n ** searchCount;
        }

        const firstBlock = await this.client.getBlock({ blockNumber: 0n });

        if (firstBlock.timestamp <= timestamp) {
            return firstBlock;
        }

        throw new TimestampNotFound(timestamp);
    }

    private async estimateBlockTime(lastBlock: BlockWithNumber, blocksLookback: bigint) {
        logger.info("Estimating block time...");

        const pastBlock = await this.client.getBlock({
            blockNumber: lastBlock.number - BigInt(blocksLookback),
        });

        const estimatedBlockTime = (lastBlock.timestamp - pastBlock.timestamp) / blocksLookback;

        logger.info(`Estimated block time: ${estimatedBlockTime}.`);

        return estimatedBlockTime;
    }

    private async searchTimestamp(
        timestamp: bigint,
        between: { fromBlock: bigint; toBlock: bigint },
    ) {
        let currentBlockNumber: bigint;
        let { fromBlock: low, toBlock: high } = between;

        logger.debug(`Starting block binary search for timestamp ${timestamp}...`);

        while (low <= high) {
            currentBlockNumber = (high + low) / 2n;

            const currentBlock = await this.client.getBlock({ blockNumber: currentBlockNumber });
            const nextBlock = await this.client.getBlock({ blockNumber: currentBlockNumber + 1n });

            logger.debug(
                `Analyzing block number #${currentBlock.number} with timestamp ${currentBlock.timestamp}`,
            );

            // We do not support blocks with equal timestamps (nor non linear or non sequential chains).
            // We could support same timestamps blocks by defining a criteria based on block height
            // apart from their timestamps.
            if (nextBlock.timestamp <= currentBlock.timestamp)
                throw new UnsupportedBlockTimestamps(timestamp);

            const blockContainsTimestamp =
                currentBlock.timestamp <= timestamp && nextBlock.timestamp > timestamp;

            if (blockContainsTimestamp) {
                logger.debug(`Block #${currentBlock.number} contains timestamp.`);

                return currentBlock.number;
            } else if (currentBlock.timestamp <= timestamp) {
                low = currentBlockNumber + 1n;
            } else {
                high = currentBlockNumber - 1n;
            }
        }

        throw new TimestampNotFound(timestamp);
    }
}
