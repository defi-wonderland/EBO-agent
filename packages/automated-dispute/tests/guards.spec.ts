import { Caip2ChainId } from "@ebo-agent/blocknumber";
import { describe, expect, it } from "vitest";

import { isRequestCreatedEvent } from "../src/guards.js";
import { EboEvent, RequestId } from "../src/types/index.js";
import mocks from "./mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./services/eboActor/fixtures.js";

describe("isRequestCreatedEvent", () => {
    it("returns true when passing a RequestCreatedd event", () => {
        const id: RequestId = "0x01";

        const event: EboEvent<"RequestCreated"> = {
            name: "RequestCreated",
            blockNumber: 1n,
            logIndex: 1,
            requestId: id,
            metadata: {
                chainId: "eip155:1" as Caip2ChainId,
                epoch: 1n,
                requestId: id,
                request: DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData,
            },
        };

        expect(isRequestCreatedEvent(event)).toBe(true);
    });

    it("returns false when not passing a RequestCreated event", () => {
        const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
        const response = mocks.buildResponse(request);

        const event: EboEvent<"ResponseProposed"> = {
            name: "ResponseProposed",
            blockNumber: 1n,
            logIndex: 1,
            requestId: request.id,
            metadata: {
                requestId: request.id,
                responseId: response.id,
                response: response.prophetData,
            },
        };

        expect(isRequestCreatedEvent(event)).toBe(false);
    });
});
