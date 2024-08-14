import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types";
import { ILogger } from "@ebo-agent/shared";
import { Hex } from "viem";
import { describe, expect, it, vi } from "vitest";

import { InvalidActorState } from "../../src/exceptions/invalidActorState.exception";
import { EboEvent } from "../../src/types/events";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.ts";
import mocks from "./mocks/index.ts";

const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

describe("onResponseProposed", () => {
    const actorRequest = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

    const responseProposedEvent: EboEvent<"ResponseProposed"> = {
        name: "ResponseProposed",
        blockNumber: 1n,
        logIndex: 2,
        metadata: {
            requestId: actorRequest.id,
            responseId: "0x02",
            response: {
                proposer: "0x03",
                requestId: actorRequest.id,
                response: {
                    block: 1n,
                    chainId: actorRequest.chainId,
                    epoch: 1n,
                },
            },
        },
    };

    const proposeData = responseProposedEvent.metadata.response.response;

    it("adds the response to the registry", async () => {
        const { actor, registry, blockNumberService } = mocks.buildEboActor(actorRequest, logger);

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(proposeData.block);

        const addResponseMock = vi.spyOn(registry, "addResponse");

        await actor.onResponseProposed(responseProposedEvent);

        expect(addResponseMock).toHaveBeenCalled();
    });

    it("throws if the response's request is not handled by actor", () => {
        const { actor } = mocks.buildEboActor(actorRequest, logger);

        const otherRequestEvent = {
            ...responseProposedEvent,
            metadata: {
                ...responseProposedEvent.metadata,
                requestId: responseProposedEvent.metadata.requestId + "123",
            },
        };

        expect(actor.onResponseProposed(otherRequestEvent)).rejects.toThrowError(InvalidActorState);
    });

    it("does not dispute the response if seems valid", async () => {
        const { actor, registry, blockNumberService, protocolProvider } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(proposeData.block);

        const mockDisputeResponse = vi.spyOn(protocolProvider, "disputeResponse");

        await actor.onResponseProposed(responseProposedEvent);

        expect(mockDisputeResponse).not.toHaveBeenCalled();
    });

    it("dispute the response if it should be different", async () => {
        const { actor, registry, blockNumberService, protocolProvider } = mocks.buildEboActor(
            actorRequest,
            logger,
        );

        vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            proposeData.block + 1n,
        );

        const mockDisputeResponse = vi.spyOn(protocolProvider, "disputeResponse");

        await actor.onResponseProposed(responseProposedEvent);

        expect(mockDisputeResponse).toHaveBeenCalled();
    });
});
