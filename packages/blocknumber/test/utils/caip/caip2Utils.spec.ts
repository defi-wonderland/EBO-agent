import { describe, expect, it } from "vitest";

import { InvalidChainId } from "../../../src/exceptions/invalidChain.js";
import { Caip2Utils } from "../../../src/utils/caip/index.js";

describe("Caip2Utils", () => {
    describe("validateChainId", () => {
        it("validates a CAIP-2 compliant chain id", () => {
            const isValid = Caip2Utils.validateChainId("eip155:1");

            expect(isValid).toBe(true);
        });

        it("fails when input chain id is not caip-2 compliant", () => {
            const chainId = "foobar";

            expect(() => Caip2Utils.validateChainId(chainId)).toThrowError(InvalidChainId);
        });

        it("fails when input namespace is not caip-2 compliant", () => {
            const chainId = "f:1";

            expect(() => Caip2Utils.validateChainId(chainId)).toThrowError(InvalidChainId);
        });

        it("fails when input reference is not caip-2 compliant", () => {
            const chainId = "foo:!nval!d";

            expect(() => Caip2Utils.validateChainId(chainId)).toThrowError(InvalidChainId);
        });
    });

    describe("getNamespace", () => {
        it("returns the namespace of a caip-2 compliant chain id", () => {
            const chainId = "eip155:137";
            const result = Caip2Utils.getNamespace(chainId);

            expect(result).toEqual("eip155");
        });

        it("throws an error if the chain is invalid", () => {
            const chainId = "foo:!nval!d";

            expect(() => Caip2Utils.getNamespace(chainId)).toThrowError();
        });
    });
});
