import { describe, expect, it } from "vitest";

import { InvalidChainId } from "../../src/exceptions/invalidChain.js";
import { ChainId } from "../../src/utils/chainId.js";

describe("ChainId", () => {
    describe("constructor", () => {
        it("creates a valid chain id instance", () => {
            const chainId = new ChainId("eip155:1");

            expect(chainId).toBeInstanceOf(ChainId);
        });

        it("fails when input chain id is not caip-2 compliant", () => {
            const chainId = "foobar";

            expect(() => new ChainId(chainId)).toThrowError(InvalidChainId);
        });

        it("fails when input namespace is not caip-2 compliant", () => {
            const chainId = "f:1";

            expect(() => new ChainId(chainId)).toThrowError(InvalidChainId);
        });

        it("fails when input reference is not caip-2 compliant", () => {
            const chainId = "foo:!nval!d";

            expect(() => new ChainId(chainId)).toThrowError(InvalidChainId);
        });
    });

    describe("toString", () => {
        it("returns a CAIP-2 compliant string", () => {
            const ethChainId = "eip155:1";
            const chainId = new ChainId(ethChainId);

            expect(chainId.toString()).toEqual(ethChainId);
        });
    });
});
