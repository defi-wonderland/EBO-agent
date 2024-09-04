import { ILogger } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { InvalidActorState } from "../../src/exceptions/invalidActorState.exception";
import { EboEvent } from "../../src/types/events";
import mocks from "../mocks/index.ts";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.ts";

const logger: ILogger = mocks.mockLogger();

describe("EboActor", () => {
    describe("processEvents", () => {
        describe("when ResponseProposed is enqueued", () => {
            const actorRequest = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

            const responseProposedEvent: EboEvent<"ResponseProposed"> = {
                name: "ResponseProposed",
                requestId: actorRequest.id,
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
                const { actor, registry, blockNumberService } = mocks.buildEboActor(
                    actorRequest,
                    logger,
                );

                vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    proposeData.block,
                );

                const addResponseMock = vi.spyOn(registry, "addResponse");

                actor.enqueue(responseProposedEvent);

                await actor.processEvents();

                expect(addResponseMock).toHaveBeenCalled();
            });

            it.skip("throws if the response's request is not handled by actor", () => {
                const { actor } = mocks.buildEboActor(actorRequest, logger);

                const otherRequestEvent = {
                    ...responseProposedEvent,
                    metadata: {
                        ...responseProposedEvent.metadata,
                        requestId: responseProposedEvent.metadata.requestId + "123",
                    },
                };

                expect(actor.onResponseProposed(otherRequestEvent)).rejects.toThrowError(
                    InvalidActorState,
                );
            });

            it.skip("does not dispute the response if seems valid", async () => {
                const { actor, registry, blockNumberService, protocolProvider } =
                    mocks.buildEboActor(actorRequest, logger);

                vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    proposeData.block,
                );

                const mockDisputeResponse = vi.spyOn(protocolProvider, "disputeResponse");

                await actor.onResponseProposed(responseProposedEvent);

                expect(mockDisputeResponse).not.toHaveBeenCalled();
            });

            it.skip("dispute the response if it should be different", async () => {
                const { actor, registry, blockNumberService, protocolProvider } =
                    mocks.buildEboActor(actorRequest, logger);

                vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    proposeData.block + 1n,
                );

                const mockDisputeResponse = vi.spyOn(protocolProvider, "disputeResponse");

                await actor.onResponseProposed(responseProposedEvent);

                expect(mockDisputeResponse).toHaveBeenCalled();
            });
        });
    });
});
