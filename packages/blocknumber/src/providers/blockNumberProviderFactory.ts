import { Caip2ChainId, Caip2Utils, EBO_SUPPORTED_CHAINS_CONFIG, ILogger } from "@ebo-agent/shared";
import { FallbackTransport, HttpTransport, PublicClient } from "viem";

import { UnsupportedChain } from "../exceptions/unsupportedChain.js";
import {
    BlockmetaClientConfig,
    BlockmetaJsonBlockNumberProvider,
} from "./blockmetaJsonBlockNumberProvider.js";
import { EvmBlockNumberProvider } from "./evmBlockNumberProvider.js";

const DEFAULT_PROVIDER_CONFIG = {
    blocksLookback: 10_000n,
    deltaMultiplier: 2,
};

export class BlockNumberProviderFactory {
    /**
     * Build a `BlockNumberProvider` to handle communication with the specified chain.
     *
     * @param chainId CAIP-2 chain id
     * @param evmClient a viem public client
     * @param logger a ILogger instance
     * @returns
     */
    public static buildProvider(
        chainId: Caip2ChainId,
        evmClient: PublicClient<FallbackTransport<HttpTransport[]>>,
        blockmetaConfig: BlockmetaClientConfig,
        logger: ILogger,
    ) {
        // TODO: initialize factory instance with evmClient and blockmetaConfig and
        //  remove them from this method parameters
        const chainNamespace = Caip2Utils.getNamespace(chainId);

        switch (chainNamespace) {
            case EBO_SUPPORTED_CHAINS_CONFIG.evm.namespace:
                return new EvmBlockNumberProvider(evmClient, DEFAULT_PROVIDER_CONFIG, logger);

            case EBO_SUPPORTED_CHAINS_CONFIG.solana.namespace:
                return new BlockmetaJsonBlockNumberProvider(blockmetaConfig, logger);

            default:
                throw new UnsupportedChain(chainId);
        }
    }
}
