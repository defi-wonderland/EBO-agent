import {
    createPublicClient,
    fallback,
    FallbackTransport,
    http,
    HttpTransport,
    PublicClient,
} from "viem";

import { ChainWithoutProvider, EmptyRpcUrls, UnsupportedChain } from "../exceptions/index.js";
import { BlockNumberProvider } from "../providers/blockNumberProvider.js";
import { EvmBlockNumberProvider } from "../providers/evmBlockNumberProvider.js";
import { Caip2ChainId } from "../types.js";
import { Caip2 } from "../utils/index.js";

type RpcUrl = NonNullable<Parameters<typeof http>[0]>;

const DEFAULT_PROVIDER_CONFIG = {
    blocksLookback: 10_000n,
    deltaMultiplier: 2n,
};

export class BlockNumberService {
    private blockNumberProviders: Map<Caip2ChainId, BlockNumberProvider>;

    constructor(chainRpcUrls: Map<Caip2ChainId, RpcUrl[]>) {
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

        const e = epochBlockNumbers.filter(
            (entry): entry is [Caip2ChainId, bigint] => entry !== null,
        );

        return new Map(e);
    }

    private buildBlockNumberProviders(chainRpcUrls: Map<Caip2ChainId, RpcUrl[]>) {
        if (chainRpcUrls.size == 0) throw new EmptyRpcUrls();

        const providers = new Map<Caip2ChainId, BlockNumberProvider>();

        for (const [chainId, urls] of chainRpcUrls) {
            const client = createPublicClient({
                transport: fallback(urls.map((url) => http(url))),
            });

            const provider = BlockNumberService.buildProvider(chainId, client);

            if (!provider) throw new ChainWithoutProvider(chainId);

            providers.set(chainId, provider);
        }

        return providers;
    }

    public static buildProvider(
        chainId: Caip2ChainId,
        client: PublicClient<FallbackTransport<HttpTransport[]>>,
    ) {
        const chainNamespace = Caip2.getNamespace(chainId);

        switch (chainNamespace) {
            case "eip155":
                return new EvmBlockNumberProvider(client, DEFAULT_PROVIDER_CONFIG);

            default:
                throw new UnsupportedChain(chainId);
        }
    }
}
