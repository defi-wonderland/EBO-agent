import { ILogger } from "@ebo-agent/shared";
import MockAxiosAdapter from "axios-mock-adapter";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BlockmetaConnectionFailed, UndefinedBlockNumber } from "../../src/exceptions/index.js";
import { BlockmetaJsonBlockNumberProvider } from "../../src/providers/index.js";

describe("BlockmetaBlockNumberService", () => {
    const config = {
        baseUrl: new URL("localhost:443"),
        bearerToken: jwt.sign({}, "secret", { expiresIn: "10y" }),
        bearerTokenExpirationWindow: 365 * 24 * 60 * 60 * 1000, // 1 year
        servicePaths: {
            blockByTime: "/sf.blockmeta.v2.BlockByTime",
            block: "/sf.blockmeta.v2.Block",
        },
    };

    let logger: ILogger;

    beforeEach(() => {
        logger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };
    });

    describe("initialize", () => {
        it("returns a validated provider", async () => {
            const mockTestConnection = vi
                .spyOn(BlockmetaJsonBlockNumberProvider.prototype, "testConnection")
                .mockResolvedValue(true);

            const provider = await BlockmetaJsonBlockNumberProvider.initialize(config, logger);

            expect(provider).toBeInstanceOf(BlockmetaJsonBlockNumberProvider);

            mockTestConnection.mockRestore();
        });

        it("throws if could not establish connection", () => {
            const mockTestConnection = vi
                .spyOn(BlockmetaJsonBlockNumberProvider.prototype, "testConnection")
                .mockResolvedValue(false);

            expect(BlockmetaJsonBlockNumberProvider.initialize(config, logger)).rejects.toThrow(
                BlockmetaConnectionFailed,
            );

            mockTestConnection.mockRestore();
        });
    });

    describe("testConnection", () => {
        it("returns true if connection was established successfully", async () => {
            const provider = new BlockmetaJsonBlockNumberProvider(config, logger);

            const mockProviderAxios = new MockAxiosAdapter(provider["axios"]);

            mockProviderAxios
                .onPost(`${config.servicePaths.block}/Head`, undefined, {
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${config.bearerToken}`,
                        "Content-Type": "application/json",
                    }),
                })
                .reply(200, {
                    id: "123abc",
                    num: "1",
                    time: "2024-01-01T00:00:00.000Z",
                });

            const result = await provider.testConnection();

            expect(result).toBe(true);
        });

        it("returns false if connection was not established", async () => {
            const provider = new BlockmetaJsonBlockNumberProvider(config, logger);

            const mockProviderAxios = new MockAxiosAdapter(provider["axios"]);

            mockProviderAxios
                .onPost(`${config.servicePaths.block}/Head`, undefined, {
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${config.bearerToken}`,
                        "Content-Type": "application/json",
                    }),
                })
                .reply(401);

            const result = await provider.testConnection();

            expect(result).toBe(false);
        });

        it("warns if the token is expiring soon", async () => {
            const expirationWindow = 1 * 60 * 60 * 1000; // 1 day;
            const token = jwt.sign({}, "secret-key", {
                expiresIn: "1h",
            });

            const expiringSoonConfig = {
                ...config,
                bearerToken: token,
                bearerTokenExpirationWindow: expirationWindow,
            };

            const provider = new BlockmetaJsonBlockNumberProvider(expiringSoonConfig, logger);

            const mockProviderAxios = new MockAxiosAdapter(provider["axios"]);

            mockProviderAxios
                .onPost(`${config.servicePaths.block}/Head`, undefined, {
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${config.bearerToken}`,
                        "Content-Type": "application/json",
                    }),
                })
                .reply(200);

            await provider.testConnection();

            expect(logger.warn).toHaveBeenCalledOnce();
        });

        it.todo("notifies if the token is expiring soon");
    });

    describe("getEpochBlockNumber", () => {
        it("returns the blocknumber from the blockmeta service", async () => {
            const provider = new BlockmetaJsonBlockNumberProvider(config, logger);
            const mockProviderAxios = new MockAxiosAdapter(provider["axios"]);
            const timestamp = BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0));
            const blockNumber = 100n;

            mockProviderAxios
                .onPost(
                    `${config.servicePaths.blockByTime}/At`,
                    {
                        time: "2024-01-01T00:00:00.000Z",
                    },
                    {
                        headers: expect.objectContaining({
                            Authorization: `Bearer ${config.bearerToken}`,
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
            const provider = new BlockmetaJsonBlockNumberProvider(config, logger);
            const mockProviderAxios = new MockAxiosAdapter(provider["axios"]);
            const timestamp = BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0));
            const blockNumber = 100n;

            mockProviderAxios
                .onPost(
                    `${config.servicePaths.blockByTime}/At`,
                    {
                        time: "2024-01-01T00:00:00.000Z",
                    },
                    {
                        headers: expect.objectContaining({
                            Authorization: `Bearer ${config.bearerToken}`,
                            "Content-Type": "application/json",
                        }),
                    },
                )
                .reply(404)
                .onPost(
                    `${config.servicePaths.blockByTime}/Before`,
                    {
                        time: "2024-01-01T00:00:00.000Z",
                    },
                    {
                        headers: expect.objectContaining({
                            Authorization: `Bearer ${config.bearerToken}`,
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

        it("throws if response has no block number", () => {
            const provider = new BlockmetaJsonBlockNumberProvider(config, logger);
            const mockProviderAxios = new MockAxiosAdapter(provider["axios"]);
            const timestamp = BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0));

            mockProviderAxios
                .onPost(
                    `${config.servicePaths.blockByTime}/At`,
                    {
                        time: "2024-01-01T00:00:00.000Z",
                    },
                    {
                        headers: expect.objectContaining({
                            Authorization: `Bearer ${config.bearerToken}`,
                            "Content-Type": "application/json",
                        }),
                    },
                )
                .reply(404)
                .onPost(
                    `${config.servicePaths.blockByTime}/Before`,
                    {
                        time: "2024-01-01T00:00:00.000Z",
                    },
                    {
                        headers: expect.objectContaining({
                            Authorization: `Bearer ${config.bearerToken}`,
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
            const provider = new BlockmetaJsonBlockNumberProvider(config, logger);
            const bigTimestamp = BigInt(Number.MAX_SAFE_INTEGER) + 1n;

            expect(provider.getEpochBlockNumber(bigTimestamp)).rejects.toThrow(RangeError);
        });

        it("throws when timestamp is too small", () => {
            const provider = new BlockmetaJsonBlockNumberProvider(config, logger);
            const bigTimestamp = -1n;

            expect(provider.getEpochBlockNumber(bigTimestamp)).rejects.toThrow(RangeError);
        });

        it("warns if the token is expiring soon", async () => {
            const expirationWindow = 1 * 60 * 60 * 1000; // 1 day;
            const token = jwt.sign({}, "secret-key", {
                expiresIn: "1h",
            });

            const expiringSoonConfig = {
                ...config,
                bearerToken: token,
                bearerTokenExpirationWindow: expirationWindow,
            };

            const provider = new BlockmetaJsonBlockNumberProvider(expiringSoonConfig, logger);

            const timestamp = BigInt(Date.UTC(2024, 0, 1, 0, 0, 0, 0));
            const mockProviderAxios = new MockAxiosAdapter(provider["axios"]);

            mockProviderAxios.onPost(`${config.servicePaths.blockByTime}/At`).reply(200, {
                id: "123abc",
                num: "1",
                time: "2024-01-01T00:00:00.000Z",
            });

            await provider.getEpochBlockNumber(timestamp);

            expect(logger.warn).toHaveBeenCalledOnce();
        });

        it.todo("notifies if the token is expiring soon");
    });
});
