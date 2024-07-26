import { createPublicClient, fallback, http } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    ChainWithoutProvider,
    EmptyRpcUrls,
    UnsupportedChain,
} from "../../src/exceptions/index.js";
import { EvmBlockNumberProvider } from "../../src/providers/evmBlockNumberProvider.js";
import { BlockNumberService } from "../../src/services/index.js";
import { Caip2ChainId } from "../../src/types.js";
import { chains as caip2Chains } from "../../src/utils/caip/caip2.js";

describe("BlockNumberService", () => {
    describe("constructor", () => {
        const dummyProviders: Record<Caip2ChainId, any> = {
            [caip2Chains.mainnet]: {
                getEpochBlockNumber: async () => undefined,
                providerClass: EvmBlockNumberProvider,
            },
            [caip2Chains.polygon]: {
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
            const service = new BlockNumberService(rpcUrls);

            expect(service).toBeInstanceOf(BlockNumberService);
        });

        it("fails if initialized without any chain", () => {
            const emptyRpcUrls = new Map();

            expect(() => new BlockNumberService(emptyRpcUrls)).toThrow(EmptyRpcUrls);
        });
    });

    describe("buildProvider", () => {
        const client = createPublicClient({ transport: fallback([http("http://localhost:8545")]) });

        it("builds a provider", () => {
            const provider = BlockNumberService.buildProvider(caip2Chains.mainnet, client);

            expect(provider).toBeInstanceOf(EvmBlockNumberProvider);
        });

        it("fails if chain is not supported", () => {
            const unsupportedChainId = "eip155:80085" as Caip2ChainId;

            expect(() => {
                BlockNumberService.buildProvider(unsupportedChainId, client);
            }).toThrow(UnsupportedChain);
        });
    });

    describe("getEpochBlockNumbers", () => {
        const dummyProviders: Record<Caip2ChainId, any> = {
            [caip2Chains.mainnet]: {
                getEpochBlockNumber: async () => 1234n,
                providerClass: EvmBlockNumberProvider,
            },
            [caip2Chains.polygon]: {
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
            const service = new BlockNumberService(rpcUrls);

            const timestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);
            const epochChains = [caip2Chains.mainnet, caip2Chains.polygon];
            const blockNumbers = await service.getEpochBlockNumbers(timestamp, epochChains);

            epochChains.forEach(async (chain) => {
                const blockNumber = await dummyProviders[chain].getEpochBlockNumber();

                expect(blockNumbers.get(chain)).toEqual(blockNumber);
            });
        });

        it("fails if some input chain has no provider assigned", async () => {
            const service = new BlockNumberService(rpcUrls);

            const timestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);
            const epochChains = [caip2Chains.mainnet, caip2Chains.arbitrum];

            expect(service.getEpochBlockNumbers(timestamp, epochChains)).rejects.toThrow(
                ChainWithoutProvider,
            );
        });

        it("fails if a provider fails", async () => {
            const failingProviders = {
                [caip2Chains.mainnet]: {
                    getEpochBlockNumber: async () => {
                        throw new Error();
                    },
                    providerClass: EvmBlockNumberProvider,
                },
            };

            spyWithDummyProviders(failingProviders);

            const rpcUrls: Map<Caip2ChainId, string[]> = new Map([
                [caip2Chains.mainnet, ["http://localhost:8545"]],
            ]);

            const service = new BlockNumberService(rpcUrls);
            const timestamp = Date.UTC(2024, 1, 1, 0, 0, 0, 0);

            expect(
                service.getEpochBlockNumbers(timestamp, [caip2Chains.mainnet]),
            ).rejects.toBeDefined();

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

    vi.spyOn(BlockNumberService, "buildProvider").mockImplementation(dummyProvider);
}
