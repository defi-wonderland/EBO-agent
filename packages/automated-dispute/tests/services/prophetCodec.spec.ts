import { isHex } from "viem";
import { describe, expect, it } from "vitest";

import { ProphetCodec } from "../../src/services";
import { Response } from "../../src/types";

describe("ProphetCodec", () => {
    describe("encodeResponse", () => {
        const response: Response["decodedData"]["response"] = {
            block: 1n,
        };

        it("generates a hex string with the response encoded", () => {
            const encodedResponse = ProphetCodec.encodeResponse(response);

            expect(encodedResponse).toSatisfy((bytes) => isHex(bytes));
        });

        it("is able to decode encoded data correctly", () => {
            const encodedResponse = ProphetCodec.encodeResponse(response);
            const decodedResponse = ProphetCodec.decodeResponse(encodedResponse);

            expect(decodedResponse).toEqual(response);
        });
    });

    describe.todo("decodeResponse");

    describe.todo("decodeRequestRequestModuleData");
    describe.todo("encodeRequestRequestModuleData");
    describe.todo("decodeRequestResponseModuleData");
    describe.todo("encodeRequestResponseModuleData");
    describe.todo("decodeRequestDisputeModuleData");
    describe.todo("encodeRequestDisputeModuleData");
});
