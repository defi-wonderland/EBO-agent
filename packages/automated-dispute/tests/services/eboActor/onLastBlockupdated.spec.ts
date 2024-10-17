import { UnixTimestamp } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { DisputeWithoutResponse } from "../../../src/exceptions/index.js";
import { ResponseId } from "../../../src/types/prophet.js";
import mocks from "../../mocks";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures";

const logger = mocks.mockLogger();

describe("EboActor", () => {
    describe("onLastBlockUpdated", () => {
        it("settles all disputes when escalation deadline and tying buffer passed", async () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const { disputeModuleData } = request.decodedData;

            const responseToSettle = mocks.buildResponse(request, { id: "0x10" as ResponseId });

            const disputeToSettle = mocks.buildDispute(request, responseToSettle, {
                createdAt: {
                    timestamp: 1n as UnixTimestamp,
                    blockNumber: 1000n,
                    logIndex: 0,
                },
            });
            const disputeDeadlineDelta =
                disputeModuleData.bondEscalationDeadline + disputeModuleData.tyingBuffer;

            const disputeDeadline = (disputeToSettle.createdAt.timestamp +
                disputeDeadlineDelta) as UnixTimestamp;

            const responseToNotSettle = mocks.buildResponse(request, { id: "0x11" as ResponseId });
            const disputeToNotSettle = mocks.buildDispute(request, responseToNotSettle, {
                createdAt: {
                    // Should be settled 1 second after the other dispute deadline
                    timestamp: (disputeToSettle.createdAt.timestamp + 1n) as UnixTimestamp,
                    blockNumber: 1000n,
                    logIndex: 0,
                },
            });

            const { actor, registry, protocolProvider } = mocks.buildEboActor(request, logger);

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponse").mockImplementation((id) => {
                switch (id) {
                    case responseToSettle.id:
                        return responseToSettle;

                    case responseToNotSettle.id:
                        return responseToNotSettle;
                }
            });
            // Skipping finalize flow with this mock
            vi.spyOn(registry, "getResponses").mockReturnValue([]);
            vi.spyOn(registry, "getDisputes").mockReturnValue([
                disputeToSettle,
                disputeToNotSettle,
            ]);

            const mockSettleDispute = vi
                .spyOn(protocolProvider, "settleDispute")
                .mockImplementation(() => Promise.resolve());

            const newBlockNumber = disputeDeadline + 1n;

            await actor.onLastBlockUpdated(newBlockNumber as UnixTimestamp);

            expect(mockSettleDispute).toHaveBeenCalledWith(
                request.prophetData,
                responseToSettle.prophetData,
                disputeToSettle.prophetData,
            );

            expect(mockSettleDispute).not.toHaveBeenCalledWith(
                request.prophetData,
                responseToNotSettle.prophetData,
                disputeToNotSettle.prophetData,
            );
        });

        it("throws error when settleDispute fails during onLastBlockUpdated", async () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const { disputeModuleData } = request.decodedData;

            const response = mocks.buildResponse(request, { id: "0x10" as ResponseId });
            const dispute = mocks.buildDispute(request, response, {
                createdAt: {
                    timestamp: 1n as UnixTimestamp,
                    blockNumber: 1000n,
                    logIndex: 0,
                },
            });
            const disputeDeadlineDelta =
                disputeModuleData.bondEscalationDeadline + disputeModuleData.tyingBuffer;

            const disputeDeadline = dispute.createdAt.timestamp + disputeDeadlineDelta;

            const { actor, registry, protocolProvider } = mocks.buildEboActor(request, logger);

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponse").mockImplementation((id) => {
                if (id === response.id) return response;
            });
            vi.spyOn(registry, "getResponses").mockReturnValue([]);
            vi.spyOn(registry, "getDisputes").mockReturnValue([dispute]);

            const settleError = new Error("SettleDispute failed");

            vi.spyOn(protocolProvider, "settleDispute").mockRejectedValue(settleError);

            const newBlockNumber = disputeDeadline + 1n;

            await expect(actor.onLastBlockUpdated(newBlockNumber as UnixTimestamp)).rejects.toThrow(
                settleError,
            );
        });

        it("throws if the dispute has no response in registry", async () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const { disputeModuleData } = request.decodedData;

            const response = mocks.buildResponse(request, { id: "0x10" as ResponseId });
            const dispute = mocks.buildDispute(request, response, {
                createdAt: {
                    timestamp: 1n as UnixTimestamp,
                    blockNumber: 1000n,
                    logIndex: 0,
                },
            });
            const disputeDeadline =
                disputeModuleData.bondEscalationDeadline + disputeModuleData.tyingBuffer;

            const { actor, registry } = mocks.buildEboActor(request, logger);

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponse").mockReturnValue(undefined);
            // Skipping finalize flow with this mock
            vi.spyOn(registry, "getResponses").mockReturnValue([]);
            vi.spyOn(registry, "getDisputes").mockReturnValue([dispute]);

            const newBlockNumber = disputeDeadline + 1n;

            expect(actor.onLastBlockUpdated(newBlockNumber as UnixTimestamp)).rejects.toThrow(
                DisputeWithoutResponse,
            );
        });

        it.skip("notifies dispute escalation");

        it("logs and returns when response deadline has not been reached", async () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const response = mocks.buildResponse(request, { id: "0x10" as ResponseId });

            const { responseModuleData } = request.decodedData;
            const deadline = responseModuleData.deadline;

            const { actor, registry, protocolProvider } = mocks.buildEboActor(request, logger);

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponse").mockImplementation((id) => {
                switch (id) {
                    case response.id:
                        return response;
                }
            });

            const newBlockNumber = deadline - 1n;
            const mockFinalize = vi.spyOn(protocolProvider, "finalize");

            await actor.onLastBlockUpdated(newBlockNumber as UnixTimestamp);

            expect(logger.debug).toBeCalledWith(
                expect.stringMatching(`Proposal window for request ${request.id} not closed yet.`),
            );

            expect(mockFinalize).not.toHaveBeenCalled();
        });

        it("finalizes the request using the first accepted response", async () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

            const firstResponse = mocks.buildResponse(request, {
                id: "0x10" as ResponseId,
                createdAt: {
                    timestamp: 5n as UnixTimestamp,
                    blockNumber: 1000n,
                    logIndex: 0,
                },
            });

            const firstResponseDispute = mocks.buildDispute(request, firstResponse, {
                status: "Lost",
                createdAt: {
                    timestamp: 5n as UnixTimestamp,
                    blockNumber: 1001n,
                    logIndex: 0,
                },
            });

            const secondResponse = mocks.buildResponse(request, {
                id: "0x11" as ResponseId,
                createdAt: {
                    timestamp: 10n as UnixTimestamp,
                    blockNumber: 1000n,
                    logIndex: 0,
                },
            });

            const { actor, registry, protocolProvider } = mocks.buildEboActor(request, logger);

            const reverseResponses = [secondResponse, firstResponse];

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponses").mockReturnValue(reverseResponses);
            vi.spyOn(registry, "getDispute").mockReturnValue(firstResponseDispute);

            const mockFinalize = vi.spyOn(protocolProvider, "finalize").mockImplementation(() => {
                return Promise.resolve();
            });

            const { disputeModuleData, responseModuleData } = request.decodedData;

            const firstResponseDeadline =
                firstResponseDispute.createdAt.timestamp +
                disputeModuleData.bondEscalationDeadline +
                disputeModuleData.tyingBuffer;

            const secondResponseDeadline =
                secondResponse.createdAt.timestamp + responseModuleData.disputeWindow;

            const proposalDeadline = request.createdAt.timestamp + responseModuleData.deadline;

            const newBlock =
                [firstResponseDeadline, secondResponseDeadline, proposalDeadline].reduce(
                    (prev, curr) => (prev > curr ? prev : curr),
                ) + 1n;

            await actor.onLastBlockUpdated(newBlock as UnixTimestamp);

            expect(mockFinalize).toHaveBeenCalledWith(
                request.prophetData,
                firstResponse.prophetData,
            );
        });
    });
});
