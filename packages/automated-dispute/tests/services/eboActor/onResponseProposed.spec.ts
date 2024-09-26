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
                        proposer: "0x0000000000000000000000000000000000000003",
                        requestId: actorRequest.id,
                        response: ProtocolProvider.encodeResponse(proposedResponseBody),
                    },
                },
            };

            const proposeData = responseProposedEvent.metadata.response.response;

            it("adds the response to the registry", async () => {
                const { actor, registry, blockNumberService, protocolProvider } =
                    mocks.buildEboActor(actorRequest, logger);

                vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    proposedResponseBody.block,
                );

                vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue({
                    number: proposeData.epoch,
                    firstBlockNumber: 1n,
                    startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
                });

                const addResponseMock = vi.spyOn(registry, "addResponse");

                actor.enqueue(responseProposedEvent);

                await actor.processEvents();

                expect(addResponseMock).toHaveBeenCalled();
            });

            it("does not dispute the response if seems valid", async () => {
                expect.assertions(1);

                const { actor, registry, blockNumberService, protocolProvider } =
                    mocks.buildEboActor(actorRequest, logger);

                vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    proposedResponseBody.block,
                );

                vi.spyOn(protocolProvider, "disputeResponse").mockResolvedValue(undefined);

                vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue({
                    number: proposeData.epoch,
                    firstBlockNumber: 1n,
                    startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
                });

                actor.enqueue(responseProposedEvent);

                await actor.processEvents();

                expect(protocolProvider.disputeResponse).not.toHaveBeenCalled();
            });

            it("disputes the response if it should be different", async () => {
                expect.assertions(1);

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

                vi.spyOn(protocolProvider, "disputeResponse").mockResolvedValue(
                    await Promise.resolve(),
                );

                actor.enqueue(responseProposedEvent);

                await actor.processEvents();

                expect(protocolProvider.disputeResponse).toHaveBeenCalled();
            });
        });
    });
});
