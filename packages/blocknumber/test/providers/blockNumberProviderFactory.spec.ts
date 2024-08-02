import { Logger } from "@ebo-agent/shared";
import { createPublicClient, fallback, http } from "viem";
import { describe, expect, it } from "vitest";

import { UnsupportedChain } from "../../src/exceptions";
import { BlockNumberProviderFactory } from "../../src/providers/blockNumberProviderFactory";
import { EvmBlockNumberProvider } from "../../src/providers/evmBlockNumberProvider";
import { Caip2ChainId } from "../../src/types";

describe("BlockNumberProviderFactory", () => {
    const logger = Logger.getInstance();

    describe("buildProvider", () => {
        const client = createPublicClient({ transport: fallback([http("http://localhost:8545")]) });

        it("builds a provider", () => {
            const provider = BlockNumberProviderFactory.buildProvider("eip155:1", client, logger);

            expect(provider).toBeInstanceOf(EvmBlockNumberProvider);
        });

        it("fails if chain is not supported", () => {
            const unsupportedChainId = "solana:80085" as Caip2ChainId;

            expect(() => {
                BlockNumberProviderFactory.buildProvider(unsupportedChainId, client, logger);
            }).toThrow(UnsupportedChain);
        });
    });
});
