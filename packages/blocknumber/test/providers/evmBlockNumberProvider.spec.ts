import { Logger } from "@ebo-agent/shared";
import { Block, createPublicClient, GetBlockParameters, http } from "viem";
import { mainnet } from "viem/chains";
import { describe, expect, it, vi } from "vitest";

import {
    InvalidTimestamp,
    LastBlockEpoch,
    UnsupportedBlockNumber,
    UnsupportedBlockTimestamps,
} from "../../src/exceptions/index.js";
import { EvmBlockNumberProvider } from "../../src/providers/evmBlockNumberProvider.js";

describe("EvmBlockNumberProvider", () => {
    describe("getEpochBlockNumber", () => {
        const searchConfig = { blocksLookback: 2n, deltaMultiplier: 2n };
        const logger = Logger.getInstance();
        let evmProvider: EvmBlockNumberProvider;

        it("returns the first of two consecutive blocks when their timestamp contains the searched timestamp", async () => {
            const blockNumber = 10n;
            const startTimestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);
            const endTimestamp = Date.UTC(2024, 1, 11, 0, 0, 0, 0);
            const rpcProvider = mockRpcProvider(blockNumber, startTimestamp, endTimestamp);

            evmProvider = new EvmBlockNumberProvider(rpcProvider, searchConfig, logger);

            const day5 = Date.UTC(2024, 1, 5, 2, 0, 0, 0);
            const epochBlockNumber = await evmProvider.getEpochBlockNumber(day5);

            expect(epochBlockNumber).toEqual(4n);
        });

        it("returns the block number when the timestamp is equal to block's timestamp", async () => {
            const lastBlockNumber = 10n;
            const startTimestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);
            const endTimestamp = Date.UTC(2024, 1, 1, 0, 0, 11, 0);
            const rpcProvider = mockRpcProvider(lastBlockNumber, startTimestamp, endTimestamp);

            evmProvider = new EvmBlockNumberProvider(rpcProvider, searchConfig, logger);

            const exactDay5 = Date.UTC(2024, 1, 1, 0, 0, 5, 0);
            const epochBlockNumber = await evmProvider.getEpochBlockNumber(exactDay5);

            expect(epochBlockNumber).toEqual(4n);
        });

        it("throws if the search timestamp is after the last block's timestamp", async () => {
            const lastBlockNumber = 10n;
            const startTimestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);
            const endTimestamp = Date.UTC(2024, 1, 1, 0, 0, 11, 0);
            const rpcProvider = mockRpcProvider(lastBlockNumber, startTimestamp, endTimestamp);

            evmProvider = new EvmBlockNumberProvider(rpcProvider, searchConfig, logger);

            const futureTimestamp = Date.UTC(2025, 1, 1, 0, 0, 0, 0);

            expect(evmProvider.getEpochBlockNumber(futureTimestamp)).rejects.toBeInstanceOf(
                LastBlockEpoch,
            );
        });

        it("fails if the timestamp is before the first block", async () => {
            const lastBlockNumber = 10n;
            const startTimestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);
            const endTimestamp = Date.UTC(2024, 1, 1, 0, 0, 11, 0);
            const rpcProvider = mockRpcProvider(lastBlockNumber, startTimestamp, endTimestamp);

            evmProvider = new EvmBlockNumberProvider(rpcProvider, searchConfig, logger);

            const futureTimestamp = Date.UTC(1970, 1, 1, 0, 0, 0, 0);

            expect(evmProvider.getEpochBlockNumber(futureTimestamp)).rejects.toBeInstanceOf(
                InvalidTimestamp,
            );
        });

        it("fails when finding multiple blocks with the same timestamp", () => {
            const timestamp = BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0));
            const afterTimestamp = BigInt(Date.UTC(2024, 1, 2, 0, 0, 0, 0));
            const rpcProvider = mockRpcProviderBlocks([
                { number: 0n, timestamp: timestamp },
                { number: 1n, timestamp: timestamp },
                { number: 2n, timestamp: timestamp },
                { number: 3n, timestamp: timestamp },
                { number: 4n, timestamp: afterTimestamp },
            ]);

            evmProvider = new EvmBlockNumberProvider(rpcProvider, searchConfig, logger);

            expect(evmProvider.getEpochBlockNumber(Number(timestamp))).rejects.toBeInstanceOf(
                UnsupportedBlockTimestamps,
            );
        });

        it("fails when finding a block with no number", () => {
            const timestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);
            const rpcProvider = mockRpcProviderBlocks([
                { number: null, timestamp: BigInt(timestamp) },
            ]);

            evmProvider = new EvmBlockNumberProvider(rpcProvider, searchConfig, logger);

            expect(evmProvider.getEpochBlockNumber(Number(timestamp))).rejects.toBeInstanceOf(
                UnsupportedBlockNumber,
            );
        });

        it("fails when the data provider fails", () => {
            const client = createPublicClient({ chain: mainnet, transport: http() });

            client.getBlock = vi.fn().mockRejectedValue(null);

            evmProvider = new EvmBlockNumberProvider(client, searchConfig, logger);
            const timestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);

            expect(evmProvider.getEpochBlockNumber(timestamp)).rejects.toBeDefined();
        });
    });
});

function mockRpcProvider(lastBlock: bigint, startTimestamp: number, endTimestamp: number) {
    const chainDuration = endTimestamp - startTimestamp;
    const blockDuration = BigInt(chainDuration) / lastBlock;

    const rpcProvider = createPublicClient({ chain: mainnet, transport: http() });

    rpcProvider.getBlock = vi
        .fn()
        .mockImplementation((args?: GetBlockParameters<false, "finalized"> | undefined) => {
            if (args?.blockTag == "finalized") {
                return Promise.resolve({
                    timestamp: BigInt(endTimestamp),
                    number: lastBlock,
                });
            } else if (args?.blockNumber !== undefined) {
                const blockNumber = args.blockNumber;
                const blockTimestamp = BigInt(startTimestamp) + blockNumber * blockDuration;

                return Promise.resolve({ timestamp: blockTimestamp, number: blockNumber });
            }

            throw new Error("Unhandled getBlock mock case");
        });

    return rpcProvider;
}

function mockRpcProviderBlocks(blocks: Pick<Block, "timestamp" | "number">[]) {
    const rpcProvider = createPublicClient({ chain: mainnet, transport: http() });

    rpcProvider.getBlock = vi
        .fn()
        .mockImplementation((args?: GetBlockParameters<false, "finalized"> | undefined) => {
            if (args?.blockTag == "finalized") {
                return Promise.resolve(blocks[blocks.length - 1]);
            } else if (args?.blockNumber !== undefined) {
                const blockNumber = Number(args.blockNumber);

                return Promise.resolve(blocks[blockNumber]);
            }

            throw new Error("Unhandled getBlock mock case");
        });

    return rpcProvider;
}
