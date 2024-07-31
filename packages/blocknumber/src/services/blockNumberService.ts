import { ILogger, supportedChains } from "@ebo-agent/shared";
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

    public async getEpochBlockNumbers(timestamp: number, chains: Caip2ChainId[]) {
        const epochBlockNumbers = await Promise.all(
            chains.map(async (chainId) => {
                const provider = this.blockNumberProviders.get(chainId);

                if (!provider) throw new ChainWithoutProvider(chainId);

                const blockNumber = await provider.getEpochBlockNumber(timestamp);

                return [chainId, blockNumber] as [Caip2ChainId, bigint];
            }),
        );

        const epochBlockNumbersMap = epochBlockNumbers.filter(
            (entry): entry is [Caip2ChainId, bigint] => entry !== null,
        );

        return new Map(epochBlockNumbersMap);
    }

    private buildBlockNumberProviders(chainRpcUrls: Map<Caip2ChainId, RpcUrl[]>) {
        if (chainRpcUrls.size == 0) throw new EmptyRpcUrls();

        const supportedChainIds = this.getSupportedChainIds(supportedChains);
        const providers = new Map<Caip2ChainId, BlockNumberProvider>();

        for (const [chainId, urls] of chainRpcUrls) {
            if (!supportedChainIds.includes(chainId)) throw new UnsupportedChain(chainId);

            const client = createPublicClient({
                transport: fallback(urls.map((url) => http(url))),
            });

            const provider = BlockNumberProviderFactory.buildProvider(chainId, client, this.logger);

            if (!provider) throw new ChainWithoutProvider(chainId);

            providers.set(chainId, provider);
        }

        return providers;
    }

    private getSupportedChainIds(chainsConfig: typeof supportedChains) {
        const namespacesChains = Object.values(chainsConfig);

        return namespacesChains.reduce((acc, namespaceChains) => {
            return [...acc, ...Object.values(namespaceChains.chains)];
        }, [] as string[]);
    }
}
