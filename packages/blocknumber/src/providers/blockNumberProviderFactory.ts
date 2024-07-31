import { EBO_SUPPORTED_CHAINS_CONFIG, ILogger } from "@ebo-agent/shared";
import { FallbackTransport, HttpTransport, PublicClient } from "viem";

import { UnsupportedChain } from "../exceptions/unsupportedChain.js";
import { Caip2ChainId } from "../types.js";
import { Caip2Utils } from "../utils/index.js";
import { EvmBlockNumberProvider } from "./evmBlockNumberProvider.js";

const DEFAULT_PROVIDER_CONFIG = {
    blocksLookback: 10_000n,
    deltaMultiplier: 2n,
};

export class BlockNumberProviderFactory {
    public static buildProvider(
        chainId: Caip2ChainId,
        client: PublicClient<FallbackTransport<HttpTransport[]>>,
        logger: ILogger,
    ) {
        const chainNamespace = Caip2Utils.getNamespace(chainId);

        switch (chainNamespace) {
            case EBO_SUPPORTED_CHAINS_CONFIG.evm.namespace:
                return new EvmBlockNumberProvider(client, DEFAULT_PROVIDER_CONFIG, logger);

            default:
                throw new UnsupportedChain(chainId);
        }
    }
}
