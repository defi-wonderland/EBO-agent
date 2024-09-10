import { Logger } from "@ebo-agent/shared";
import MockAxiosAdapter from "axios-mock-adapter";
import { describe, expect, it, vi } from "vitest";

import { UndefinedBlockNumber } from "../../src/exceptions/undefinedBlockNumber.js";
import { BlockmetaJsonBlockNumberProvider } from "../../src/providers/index.js";

const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
} as unknown as Logger;

describe("BlockmetaBlockNumberService", () => {
    describe("getEpochBlockNumber", () => {
        const providerOptions = {
            baseUrl: new URL("localhost:443"),
            bearerToken: "bearer-token",
            servicePath: "/sf.blockmeta.v2.BlockByTime",
        };

        it("returns the blocknumber from the blockmeta service", async () => {
            const provider = new BlockmetaJsonBlockNumberProvider(providerOptions, logger);
            const mockProviderAxios = new MockAxiosAdapter(provider["axios"]);
            const timestamp = BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0));
            const blockNumber = 100n;

            mockProviderAxios
                .onPost(
                    `${providerOptions.servicePath}/At`,
                    {
                        time: "2024-01-01T00:00:00.000Z",
                    },
                    {
                        headers: expect.objectContaining({
                            Authorization: `Bearer ${providerOptions.bearerToken}`,
                            "Content-Type": "application/json",
                        }),
                    },
                )
                .reply(200, {
                    id: "123abc",
                    num: blockNumber.toString(),
                    time: "2024-01-01T00:00:00.000Z",
                });

            const result = await provider.getEpochBlockNumber(timestamp);

            expect(result).toEqual(blockNumber);
        });

        it("fetches block number before timestamp if At call fails", async () => {
            const provider = new BlockmetaJsonBlockNumberProvider(providerOptions, logger);
            const mockProviderAxios = new MockAxiosAdapter(provider["axios"]);
            const timestamp = BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0));
            const blockNumber = 100n;

            mockProviderAxios
                .onPost(
                    `${providerOptions.servicePath}/At`,
                    {
                        time: "2024-01-01T00:00:00.000Z",
                    },
                    {
                        headers: expect.objectContaining({
                            Authorization: `Bearer ${providerOptions.bearerToken}`,
                            "Content-Type": "application/json",
                        }),
                    },
                )
                .reply(404)
                .onPost(
                    `${providerOptions.servicePath}/Before`,
                    {
                        time: "2024-01-01T00:00:00.000Z",
                    },
                    {
                        headers: expect.objectContaining({
                            Authorization: `Bearer ${providerOptions.bearerToken}`,
                            "Content-Type": "application/json",
                        }),
                    },
                )
                .reply(200, {
                    id: "123abc",
                    num: blockNumber.toString(),
                    time: "2024-01-01T00:00:00.000Z",
                });

            const result = await provider.getEpochBlockNumber(timestamp);

            expect(result).toEqual(blockNumber);
        });

        it("throws if response has no block number", async () => {
            const provider = new BlockmetaJsonBlockNumberProvider(providerOptions, logger);
            const mockProviderAxios = new MockAxiosAdapter(provider["axios"]);
            const timestamp = BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0));

            mockProviderAxios
                .onPost(
                    `${providerOptions.servicePath}/At`,
                    {
                        time: "2024-01-01T00:00:00.000Z",
                    },
                    {
                        headers: expect.objectContaining({
                            Authorization: `Bearer ${providerOptions.bearerToken}`,
                            "Content-Type": "application/json",
                        }),
                    },
                )
                .reply(404)
                .onPost(
                    `${providerOptions.servicePath}/Before`,
                    {
                        time: "2024-01-01T00:00:00.000Z",
                    },
                    {
                        headers: expect.objectContaining({
                            Authorization: `Bearer ${providerOptions.bearerToken}`,
                            "Content-Type": "application/json",
                        }),
                    },
                )
                .reply(200, {
                    id: "123abc",
                    time: "2024-01-01T00:00:00.000Z",
                });

            expect(provider.getEpochBlockNumber(timestamp)).rejects.toThrow(UndefinedBlockNumber);
        });

        it("throws when timestamp is too big", () => {
            const provider = new BlockmetaJsonBlockNumberProvider(providerOptions, logger);
            const bigTimestamp = BigInt(Number.MAX_SAFE_INTEGER) + 1n;

            expect(provider.getEpochBlockNumber(bigTimestamp)).rejects.toThrow(RangeError);
        });

        it("throws when timestamp is too small", () => {
            const provider = new BlockmetaJsonBlockNumberProvider(providerOptions, logger);
            const bigTimestamp = BigInt(Number.MIN_SAFE_INTEGER) - 1n;

            expect(provider.getEpochBlockNumber(bigTimestamp)).rejects.toThrow(RangeError);
        });
    });
});
