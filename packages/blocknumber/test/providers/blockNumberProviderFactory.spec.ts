import { Logger } from "@ebo-agent/shared";
import {
    createPublicClient,
    fallback,
    FallbackTransport,
    http,
    HttpTransport,
    PublicClient,
} from "viem";
import { describe, expect, it } from "vitest";

import { UnsupportedChain } from "../../src/exceptions/index.js";
import {
    BlockmetaClientConfig,
    BlockmetaJsonBlockNumberProvider,
    BlockNumberProviderFactory,
    EvmBlockNumberProvider,
} from "../../src/providers/index.js";
import { Caip2ChainId } from "../../src/types.js";

describe("BlockNumberProviderFactory", () => {
    const logger = Logger.getInstance();

    const client: PublicClient<FallbackTransport<HttpTransport[]>> = createPublicClient({
        transport: fallback([http("http://localhost:8545")]),
    });

    const blockmetaConfig: BlockmetaClientConfig = {
        baseUrl: new URL("localhost:443"),
        servicePath: "/sf.blockmeta.v2.BlockByTime",
        bearerToken: "bearer-token",
    };

    describe("buildProvider", () => {
        it("builds an EVM provider", () => {
            const provider = BlockNumberProviderFactory.buildProvider(
                "eip155:1",
                client,
                blockmetaConfig,
                logger,
            );

            expect(provider).toBeInstanceOf(EvmBlockNumberProvider);
        });

        it("builds a Solana Blockmeta provider", () => {
            const provider = BlockNumberProviderFactory.buildProvider(
                "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
                client,
                blockmetaConfig,
                logger,
            );

            expect(provider).toBeInstanceOf(BlockmetaJsonBlockNumberProvider);
        });

        it("fails if chain is not supported", () => {
            const unsupportedChainId = "antelope:f16b1833c747c43682f4386fca9cbb32" as Caip2ChainId;

            expect(() => {
                BlockNumberProviderFactory.buildProvider(
                    unsupportedChainId,
                    client,
                    blockmetaConfig,
                    logger,
                );
            }).toThrow(UnsupportedChain);
        });
    });
});
