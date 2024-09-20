import { ILogger } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { ProtocolProvider } from "../../../src/providers/index.js";
import { EboEvent, ResponseBody } from "../../../src/types/index.js";
import mocks from "../../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.js";

const logger: ILogger = mocks.mockLogger();

describe("EboActor", () => {
    describe("processEvents", () => {
        describe("when ResponseProposed is enqueued", () => {
            const actorRequest = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

            const proposedResponseBody: ResponseBody = {
                block: 1n,
                chainId: actorRequest.chainId,
                epoch: 1n,
            };

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
                        response: ProtocolProvider.encodeResponse(proposedResponseBody),
                    },
                },
            };

            it("adds the response to the registry", async () => {
                const { actor, registry, blockNumberService } = mocks.buildEboActor(
                    actorRequest,
                    logger,
                );

                vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    proposedResponseBody.block,
                );

                const addResponseMock = vi.spyOn(registry, "addResponse");

                actor.enqueue(responseProposedEvent);

                await actor.processEvents();

                expect(addResponseMock).toHaveBeenCalled();
            });

            it("does not dispute the response if seems valid", async () => {
                const { actor, registry, blockNumberService, protocolProvider } =
                    mocks.buildEboActor(actorRequest, logger);

                vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    proposedResponseBody.block,
                );

                const mockDisputeResponse = vi.spyOn(protocolProvider, "disputeResponse");

                actor.enqueue(responseProposedEvent);

                await actor.processEvents();

                expect(mockDisputeResponse).not.toHaveBeenCalled();
            });

            it("disputes the response if it should be different", async () => {
                const { actor, registry, blockNumberService, protocolProvider } =
                    mocks.buildEboActor(actorRequest, logger);

                vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

                vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue({
                    number: proposedResponseBody.epoch,
                    firstBlockNumber: 1n,
                    startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
                });

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    proposedResponseBody.block + 1n,
                );

                const mockDisputeResponse = vi.spyOn(protocolProvider, "disputeResponse");

                actor.enqueue(responseProposedEvent);

                await actor.processEvents();

                expect(mockDisputeResponse).toHaveBeenCalled();
            });
        });
    });
});
