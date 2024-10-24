import { ILogger, UnixTimestamp } from "@ebo-agent/shared";
import { BigNumber } from "bignumber.js";
import { Block, BlockNotFoundError, FallbackTransport, HttpTransport, PublicClient } from "viem";

import {
    InvalidTimestamp,
    LastBlockEpoch,
    TimestampNotFound,
    UnexpectedSearchRange,
    UnsupportedBlockNumber,
    UnsupportedBlockTimestamps,
} from "../exceptions/index.js";
import { BlockNumberProvider } from "./blockNumberProvider.js";

const BINARY_SEARCH_BLOCKS_LOOKBACK = 10_000n;
const BINARY_SEARCH_DELTA_MULTIPLIER = 2;

type BlockWithNumber = Omit<Block, "number"> & { number: bigint };

interface SearchConfig {
    /**
     * Indicates how many blocks should be used for estimating the chain's block time
     */
    blocksLookback: bigint;

    /**
     * Multiplier to apply to the step, used while scanning blocks backwards, to find a
     * lower bound block.
     */
    deltaMultiplier: number;
}

export class EvmBlockNumberProvider implements BlockNumberProvider {
    private client: PublicClient<FallbackTransport<HttpTransport[]>>;
    private searchConfig: SearchConfig;
    private firstBlock: Block | null;

    /**
     * Creates a new instance of PublicClient.
     *
     * @param client the viem client to use for EVM compatible RPC node calls.
     * @param searchConfig.blocksLookback amount of blocks that should be used for
     *  estimating the chain's block time. Defaults to 10.000 blocks.
     * @param searchConfig.deltaMultiplier multiplier to apply to the step, used
     *  while scanning blocks backwards during lower bound search. Defaults to 2.
     */
    constructor(
        client: PublicClient<FallbackTransport<HttpTransport[]>>,
        searchConfig: { blocksLookback?: bigint; deltaMultiplier?: number },
        private logger: ILogger,
    ) {
        this.client = client;
        this.searchConfig = {
            blocksLookback: searchConfig.blocksLookback ?? BINARY_SEARCH_BLOCKS_LOOKBACK,
            deltaMultiplier: searchConfig.deltaMultiplier ?? BINARY_SEARCH_DELTA_MULTIPLIER,
        };
        this.firstBlock = null;
    }

    async getEpochBlockNumber(timestamp: UnixTimestamp): Promise<bigint> {
        // An optimized binary search is used to look for the epoch block.

        // The EBO agent looks only for finalized blocks to avoid handling reorgs
        const upperBoundBlock = await this.client.getBlock({ blockTag: "finalized" });

        this.validateBlockNumber(upperBoundBlock);

        this.logger.info(
            `Working with latest block (number: ${upperBoundBlock.number}, timestamp: ${upperBoundBlock.timestamp})...`,
        );

        const firstBlock = await this.getFirstBlock();

        if (timestamp < firstBlock.timestamp) throw new InvalidTimestamp(timestamp);
        if (timestamp >= upperBoundBlock.timestamp) throw new LastBlockEpoch(upperBoundBlock);

        // Reduces the search space by estimating a lower bound for the binary search.
        //
        // Performing a binary search between block 0 and last block is not efficient.
        const lowerBoundBlock = await this.calculateLowerBoundBlock(timestamp, upperBoundBlock);

        // Searches for the timestamp with a binary search
        return this.searchTimestamp(timestamp, {
            fromBlock: lowerBoundBlock.number,
            toBlock: upperBoundBlock.number,
        });
    }

    /**
     * Fetches and caches the first block. Cached block will be returned if the cache is hit.
     *
     * @returns the chain's first block
     */
    private async getFirstBlock(): Promise<Block> {
        if (this.firstBlock !== null) return this.firstBlock;

        this.firstBlock = await this.client.getBlock({ blockNumber: 0n });

        return this.firstBlock;
    }

    /**
     * Validates that a block contains a non-null number
     *
     * @param block viem block
     * @throws {UnsupportedBlockNumber} when block contains a null number
     * @returns true if the block contains a non-null number
     */
    private validateBlockNumber(block: Block): block is BlockWithNumber {
        if (block.number === null)
            throw new UnsupportedBlockNumber(block.timestamp as UnixTimestamp);

        return true;
    }

    /**
     * Searches for an efficient lower bound to run the binary search, leveraging that
     * the epoch start tends to be relatively near the last block.
     *
     * The amount of blocks to look back from the last block is estimated, using an
     * estimated block-time based on the last `searchConfig.blocksLookback` blocks.
     *
     * Until a block with a timestamp before the input timestamp is found, backward
     * exponentially grown steps are performed.
     *
     * @param timestamp timestamp of the epoch start
     * @param lastBlock last block of the chain
     * @returns an optimized lower bound for a binary search space
     */
    private async calculateLowerBoundBlock(timestamp: UnixTimestamp, lastBlock: BlockWithNumber) {
        const { blocksLookback, deltaMultiplier } = this.searchConfig;

        const estimatedBlockTimeBN = await this.estimateBlockTime(lastBlock, blocksLookback);
        const timestampDeltaBN = new BigNumber((lastBlock.timestamp - timestamp).toString());

        let candidateBlockNumberBN = new BigNumber(lastBlock.number.toString())
            .minus(timestampDeltaBN.dividedBy(estimatedBlockTimeBN))
            .integerValue();

        const baseStepBN = new BigNumber(lastBlock.number.toString())
            .minus(candidateBlockNumberBN)
            .multipliedBy(deltaMultiplier);

        this.logger.info("Calculating lower bound for binary search...");

        let searchCount = 0;
        while (candidateBlockNumberBN.isGreaterThanOrEqualTo(0)) {
            const candidate = await this.client.getBlock({
                blockNumber: BigInt(candidateBlockNumberBN.toString()),
            });

            if (candidate.timestamp < timestamp) {
                this.logger.info(`Estimated lower bound at block ${candidate.number}.`);

                return candidate;
            }

            searchCount++;

            candidateBlockNumberBN = new BigNumber(lastBlock.number.toString()).minus(
                baseStepBN.multipliedBy(2 ** searchCount),
            );
        }

        const firstBlock = await this.client.getBlock({ blockNumber: 0n });

        if (firstBlock.timestamp <= timestamp) {
            return firstBlock;
        }

        throw new TimestampNotFound(timestamp);
    }

    /**
     * Estimates the chain's block time based on the last `blocksLookback` blocks.
     *
     * @param lastBlock last chain block
     * @param blocksLookback amount of blocks to look back
     * @returns the estimated block time
     */
    private async estimateBlockTime(lastBlock: BlockWithNumber, blocksLookback: bigint) {
        this.logger.info("Estimating block time...");

        const pastBlock = await this.client.getBlock({
            blockNumber: lastBlock.number - blocksLookback,
        });

        const estimatedBlockTime = new BigNumber(
            (lastBlock.timestamp - pastBlock.timestamp).toString(),
        ).dividedBy(blocksLookback.toString());

        this.logger.info(`Estimated block time: ${estimatedBlockTime}.`);

        return estimatedBlockTime;
    }

    /**
     * Performs a binary search in the specified block range to find the block corresponding to a timestamp.
     *
     * @param timestamp timestamp to find the block for
     * @param between blocks search space
     * @throws {UnsupportedBlockTimestamps} throw if a block has a smaller timestamp than a previous block.
     * @throws {TimestampNotFound} when the search is finished and no block includes the searched timestamp
     * @returns the block number
     */
    private async searchTimestamp(
        timestamp: UnixTimestamp,
        between: { fromBlock: bigint; toBlock: bigint },
    ) {
        let currentBlockNumber: bigint;
        let { fromBlock: low, toBlock: high } = between;

        if (low > high) throw new UnexpectedSearchRange(low, high);

        this.logger.debug(`Starting block binary search for timestamp ${timestamp}...`);

        while (low <= high) {
            currentBlockNumber = (high + low) / 2n;

            const currentBlock = await this.client.getBlock({ blockNumber: currentBlockNumber });
            const nextBlock = await this.searchNextBlockWithDifferentTimestamp(currentBlock);

            this.logger.debug(
                `Analyzing block number #${currentBlock.number} with timestamp ${currentBlock.timestamp}`,
            );

            // If no next block with a different timestamp is defined to ensure that the
            // searched timestamp is between two blocks, it won't be possible to answer.
            //
            // As an example, if the latest block has timestamp 1 and we are looking for timestamp 10,
            // the next block could have timestamp 2.
            if (!nextBlock) throw new TimestampNotFound(timestamp);

            // Non linear or non sequential chains are not supported.
            if (nextBlock.timestamp < currentBlock.timestamp)
                throw new UnsupportedBlockTimestamps(timestamp);

            const isCurrentBlockBeforeOrAtTimestamp = currentBlock.timestamp <= timestamp;
            const isNextBlockAfterTimestamp = nextBlock.timestamp > timestamp;
            const blockContainsTimestamp =
                isCurrentBlockBeforeOrAtTimestamp && isNextBlockAfterTimestamp;

            if (blockContainsTimestamp) {
                this.logger.debug(`Block #${currentBlock.number} contains timestamp.`);

                const result = await this.searchFirstBlockWithEqualTimestamp(currentBlock);

                return result.number;
            } else if (currentBlock.timestamp <= timestamp) {
                low = currentBlockNumber + 1n;
            } else {
                high = currentBlockNumber - 1n;
            }
        }

        throw new TimestampNotFound(timestamp);
    }

    /**
     * Find the next block with a different timestamp than `block`, moving sequentially forward
     * through the blockchain.
     *
     * @param block a `Block` with a number and a timestamp.
     * @returns a `Block` with a different timestamp, or `null` if no block with different timestamp was found.
     */
    private async searchNextBlockWithDifferentTimestamp(
        block: BlockWithNumber,
    ): Promise<BlockWithNumber | null> {
        let nextBlock: BlockWithNumber = block;

        try {
            while (nextBlock.timestamp === block.timestamp) {
                nextBlock = await this.client.getBlock({ blockNumber: nextBlock.number + 1n });
            }

            return nextBlock;
        } catch (err) {
            if (err instanceof BlockNotFoundError) {
                // This covers the case where the search surpasses the latest block
                // and no more blocks are found by block number.
                return null;
            } else {
                throw err;
            }
        }
    }

    /**
     * Search the block with the lowest height that has the same timestamp as `block`.
     *
     * @param block the block to use in the search
     * @returns a block with the same timestamp as `block` and with the lowest height.
     */
    private async searchFirstBlockWithEqualTimestamp(
        block: BlockWithNumber,
    ): Promise<BlockWithNumber> {
        let prevBlock: BlockWithNumber = block;
        let candidateBlock: BlockWithNumber = block;

        do {
            if (prevBlock.number === 0n) return prevBlock;

            candidateBlock = prevBlock;
            prevBlock = await this.client.getBlock({ blockNumber: prevBlock.number - 1n });
        } while (prevBlock.timestamp === block.timestamp);

        return candidateBlock;
    }
}
