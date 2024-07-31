import { EBO_SUPPORTED_CHAIN_IDS, ILogger } from "@ebo-agent/shared";
import { createPublicClient, fallback, http } from "viem";

import { ChainWithoutProvider, EmptyRpcUrls, UnsupportedChain } from "../exceptions/index.js";
import { BlockNumberProvider } from "../providers/blockNumberProvider.js";
import { BlockNumberProviderFactory } from "../providers/blockNumberProviderFactory.js";
import { Caip2ChainId } from "../types.js";

type RpcUrl = NonNullable<Parameters<typeof http>[0]>;

export class BlockNumberService {
    private blockNumberProviders: Map<Caip2ChainId, BlockNumberProvider>;

    constructor(
        chainRpcUrls: Map<Caip2ChainId, RpcUrl[]>,
        private readonly logger: ILogger,
    ) {
        this.blockNumberProviders = this.buildBlockNumberProviders(chainRpcUrls);
    }

    public async getEpochBlockNumber(timestamp: number, chainId: Caip2ChainId): Promise<bigint> {
        const provider = this.blockNumberProviders.get(chainId);

        if (!provider) throw new ChainWithoutProvider(chainId);

        const blockNumber = await provider.getEpochBlockNumber(timestamp);

        return blockNumber;
    }

    public async getEpochBlockNumbers(timestamp: number, chains: Caip2ChainId[]) {
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

    private isChainSupported(chainId: Caip2ChainId) {
        return EBO_SUPPORTED_CHAIN_IDS.includes(chainId);
    }
}
