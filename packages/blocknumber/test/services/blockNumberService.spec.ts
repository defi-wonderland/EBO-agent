import { Logger } from "@ebo-agent/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChainWithoutProvider, EmptyRpcUrls } from "../../src/exceptions/index.js";
import { BlockNumberProviderFactory } from "../../src/providers/blockNumberProviderFactory.js";
import { EvmBlockNumberProvider } from "../../src/providers/evmBlockNumberProvider.js";
import { BlockNumberService } from "../../src/services/index.js";
import { Caip2ChainId } from "../../src/types.js";

describe("BlockNumberService", () => {
    const logger = Logger.getInstance();

    describe("constructor", () => {
        const dummyProviders: Record<Caip2ChainId, any> = {
            "eip155:1": {
                getEpochBlockNumber: async () => undefined,
                providerClass: EvmBlockNumberProvider,
            },
            "eip155:137": {
                getEpochBlockNumber: async () => undefined,
                providerClass: EvmBlockNumberProvider,
            },
        };

        const providersChains = Object.keys(dummyProviders) as Caip2ChainId[];
        const rpcUrls = new Map(
            providersChains.map((chain) => [
                chain,
                ["http://localhost:8545", "http://localhost:8546"],
            ]),
        );

        beforeEach(() => {
            spyWithDummyProviders(dummyProviders);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("creates an instance of BlockNumberService", () => {
            const service = new BlockNumberService(rpcUrls, logger);

            expect(service).toBeInstanceOf(BlockNumberService);
        });

        it("fails if initialized without any chain", () => {
            const emptyRpcUrls = new Map();

            expect(() => new BlockNumberService(emptyRpcUrls, logger)).toThrow(EmptyRpcUrls);
        });
    });

    describe("getEpochBlockNumber", () => {
        const dummyProviders: Record<Caip2ChainId, any> = {
            "eip155:1": {
                getEpochBlockNumber: async () => 1234n,
                providerClass: EvmBlockNumberProvider,
            },
            "eip155:137": {
                getEpochBlockNumber: async () => 5678n,
                providerClass: EvmBlockNumberProvider,
            },
        } as const;

        const providersChains = Object.keys(dummyProviders) as Caip2ChainId[];
        const rpcUrls = new Map(
            providersChains.map((chain) => [
                chain,
                ["http://localhost:8545", "http://localhost:8546"],
            ]),
        );

        beforeEach(() => {
            spyWithDummyProviders(dummyProviders);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("returns the chain epoch block number", async () => {
            const service = new BlockNumberService(rpcUrls, logger);

            const timestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);
            const epochChainId = "eip155:1" as Caip2ChainId;
            const blockNumber = await service.getEpochBlockNumber(timestamp, epochChainId);

            expect(blockNumber).toEqual(1234n);
        });

        it("fails if the chain has no provider assigned", async () => {
            const service = new BlockNumberService(rpcUrls, logger);

            const timestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);
            const epochChainId = "eip155:42161" as Caip2ChainId;

            expect(service.getEpochBlockNumber(timestamp, epochChainId)).rejects.toThrow(
                ChainWithoutProvider,
            );
        });

        it("fails if the provider fails", () => {
            const failingProviders = {
                "eip155:1": {
                    getEpochBlockNumber: async () => {
                        throw new Error();
                    },
                    providerClass: EvmBlockNumberProvider,
                },
            };

            spyWithDummyProviders(failingProviders);

            const rpcUrls: Map<Caip2ChainId, string[]> = new Map([
                ["eip155:1", ["http://localhost:8545"]],
            ]);

            const service = new BlockNumberService(rpcUrls, logger);
            const timestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);

            expect(service.getEpochBlockNumber(timestamp, "eip155:1")).rejects.toBeDefined();

            vi.clearAllMocks();
        });
    });

    describe("getEpochBlockNumbers", () => {
        const dummyProviders: Record<Caip2ChainId, any> = {
            "eip155:1": {
                getEpochBlockNumber: async () => 1234n,
                providerClass: EvmBlockNumberProvider,
            },
            "eip155:137": {
                getEpochBlockNumber: async () => 5678n,
                providerClass: EvmBlockNumberProvider,
            },
        } as const;

        const providersChains = Object.keys(dummyProviders) as Caip2ChainId[];
        const rpcUrls = new Map(
            providersChains.map((chain) => [
                chain,
                ["http://localhost:8545", "http://localhost:8546"],
            ]),
        );

        beforeEach(() => {
            spyWithDummyProviders(dummyProviders);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("returns the chains' epoch block numbers", async () => {
            const service = new BlockNumberService(rpcUrls, logger);

            const timestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);
            const epochChains = ["eip155:1", "eip155:137"] as Caip2ChainId[];
            const blockNumbers = await service.getEpochBlockNumbers(timestamp, epochChains);

            epochChains.forEach(async (chain) => {
                const blockNumber = await dummyProviders[chain].getEpochBlockNumber();

                expect(blockNumbers.get(chain)).toEqual(blockNumber);
            });
        });

        it("fails if some input chain has no provider assigned", async () => {
            const service = new BlockNumberService(rpcUrls, logger);

            const timestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);
            const epochChains = ["eip155:1", "eip155:42161"] as Caip2ChainId[];

            expect(service.getEpochBlockNumbers(timestamp, epochChains)).rejects.toThrow(
                ChainWithoutProvider,
            );
        });

        it("fails if a provider fails", async () => {
            const failingProviders = {
                "eip155:1": {
                    getEpochBlockNumber: async () => {
                        throw new Error();
                    },
                    providerClass: EvmBlockNumberProvider,
                },
            };

            spyWithDummyProviders(failingProviders);

            const rpcUrls: Map<Caip2ChainId, string[]> = new Map([
                ["eip155:1", ["http://localhost:8545"]],
            ]);

            const service = new BlockNumberService(rpcUrls, logger);
            const timestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);

            expect(service.getEpochBlockNumbers(timestamp, ["eip155:1"])).rejects.toBeDefined();

            vi.clearAllMocks();
        });
    });
});

function spyWithDummyProviders(providersResults) {
    type buildProviderArgs = Parameters<typeof BlockNumberService.buildProvider>;
    const dummyProvider = (chainId: buildProviderArgs[0], client: buildProviderArgs[1]) => {
        const provider = new providersResults[chainId].providerClass(client, {});

        provider.getEpochBlockNumber = vi
            .fn()
            .mockImplementation(providersResults[chainId].getEpochBlockNumber);

        return provider;
    };

    vi.spyOn(BlockNumberProviderFactory, "buildProvider").mockImplementation(dummyProvider);
}
