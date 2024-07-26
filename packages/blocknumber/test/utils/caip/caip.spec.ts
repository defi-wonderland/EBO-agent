import { describe, expect, it } from "vitest";

import { InvalidChainId } from "../../../src/exceptions/invalidChain.js";
import { Caip2 } from "../../../src/utils/caip/index.js";

describe("Caip2", () => {
    describe("validateChainId", () => {
        it("validates a CAIP-2 compliant chain id", () => {
            const isValid = Caip2.validateChainId("eip155:1");

            expect(isValid).toBe(true);
        });

        it("fails when input chain id is not caip-2 compliant", () => {
            const chainId = "foobar";

            expect(() => Caip2.validateChainId(chainId)).toThrowError(InvalidChainId);
        });

        it("fails when input namespace is not caip-2 compliant", () => {
            const chainId = "f:1";

            expect(() => Caip2.validateChainId(chainId)).toThrowError(InvalidChainId);
        });

        it("fails when input reference is not caip-2 compliant", () => {
            const chainId = "foo:!nval!d";

            expect(() => Caip2.validateChainId(chainId)).toThrowError(InvalidChainId);
        });
    });
});
