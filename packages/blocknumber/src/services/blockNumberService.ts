import { EBO_SUPPORTED_CHAIN_IDS, ILogger, Timestamp } from "@ebo-agent/shared";
import { createPublicClient, fallback, http } from "viem";

import { ChainWithoutProvider, EmptyRpcUrls, UnsupportedChain } from "../exceptions/index.js";
import { BlockNumberProvider } from "../providers/blockNumberProvider.js";
import { BlockNumberProviderFactory } from "../providers/blockNumberProviderFactory.js";
import { Caip2ChainId } from "../types.js";

type RpcUrl = NonNullable<Parameters<typeof http>[0]>;

export class BlockNumberService {
    private blockNumberProviders: Map<Caip2ChainId, BlockNumberProvider>;

    /**
     * Create a `BlockNumberService` instance that will handle the interaction with a collection
     * of chains.
     *
     * @param chainRpcUrls a map of CAIP-2 chain ids with their RPC urls that this service will handle
     * @param logger a `ILogger` instance
     */
    constructor(
        chainRpcUrls: Map<Caip2ChainId, RpcUrl[]>,
        private readonly logger: ILogger,
    ) {
        this.blockNumberProviders = this.buildBlockNumberProviders(chainRpcUrls);
    }

    /**
     * Get a chain epoch block number based on a timestamp.
     *
     * @param timestamp UTC timestamp in ms since UNIX epoch
     * @param chainId the CAIP-2 chain id
     * @returns the block number corresponding to the timestamp
     */
    public async getEpochBlockNumber(timestamp: Timestamp, chainId: Caip2ChainId): Promise<bigint> {
        const provider = this.blockNumberProviders.get(chainId);

        if (!provider) throw new ChainWithoutProvider(chainId);

        const blockNumber = await provider.getEpochBlockNumber(timestamp);

        return blockNumber;
    }

    /**
     * Get the epoch block number for all the specified chains based on a timestamp.
     *
     * @param timestamp UTC timestamp in ms since UNIX epoch
     * @param chains a list of CAIP-2 chain ids
     * @returns a map of CAIP-2 chain ids
     */
    public async getEpochBlockNumbers(timestamp: Timestamp, chains: Caip2ChainId[]) {
        const epochBlockNumbers = await Promise.all(
            chains.map(async (chain) => ({
                chainId: chain,
                blockNumber: await this.getEpochBlockNumber(timestamp, chain),
            })),
        );

        return epochBlockNumbers.reduce((epochBlockNumbersMap, epoch) => {
            return epochBlockNumbersMap.set(epoch.chainId, epoch.blockNumber);
        }, new Map<Caip2ChainId, bigint>());
    }

    /**
     * Build a collection of `BlockNumberProvider`s instances respective to each
     * CAIP-2 chain id.
     *
     * @param chainRpcUrls a map containing chain ids with their respective list of RPC urls
     * @returns a map of CAIP-2 chain ids and their respective `BlockNumberProvider` instances
     */
    private buildBlockNumberProviders(chainRpcUrls: Map<Caip2ChainId, RpcUrl[]>) {
        if (chainRpcUrls.size == 0) throw new EmptyRpcUrls();

        const providers = new Map<Caip2ChainId, BlockNumberProvider>();

        for (const [chainId, urls] of chainRpcUrls) {
            if (!this.isChainSupported(chainId)) throw new UnsupportedChain(chainId);

            const client = createPublicClient({
                transport: fallback(urls.map((url) => http(url))),
            });

            const provider = BlockNumberProviderFactory.buildProvider(chainId, client, this.logger);

            if (!provider) throw new ChainWithoutProvider(chainId);

            providers.set(chainId, provider);
        }

        return providers;
    }

    /**
     * Check if a chain is supported by the service.
     *
     * @param chainId CAIP-2 chain id
     * @returns true if the chain is supported, false otherwise
     */
    private isChainSupported(chainId: Caip2ChainId) {
        return EBO_SUPPORTED_CHAIN_IDS.includes(chainId);
    }
}
