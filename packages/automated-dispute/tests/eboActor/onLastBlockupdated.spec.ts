import { ContractFunctionRevertedError } from "viem";
import { describe, expect, it, vi } from "vitest";

import { DisputeWithoutResponse } from "../../src/exceptions/eboActor/disputeWithoutResponse.exception";
import mocks from "../mocks";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures";

const logger = mocks.mockLogger();

describe("EboActor", () => {
    describe("onLastBlockUpdated", () => {
        it("settles all disputes when escalation deadline and tying buffer passed", async () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const { disputeModuleData } = request.prophetData;

            const response = mocks.buildResponse(request, { id: "0x10" });
            const dispute = mocks.buildDispute(request, response, { createdAt: 1n });
            const disputeDeadline =
                disputeModuleData.bondEscalationDeadline + disputeModuleData.tyingBuffer;

            const { actor, registry, protocolProvider } = mocks.buildEboActor(request, logger);

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponse").mockImplementation((id) => {
                switch (id) {
                    case response.id:
                        return response;
                }
            });
            // Skipping finalize flow with this mock
            vi.spyOn(registry, "getResponses").mockReturnValue([]);
            vi.spyOn(registry, "getDisputes").mockReturnValue([dispute]);

            const mockSettleDispute = vi
                .spyOn(protocolProvider, "settleDispute")
                .mockImplementation(() => Promise.resolve());

            const newBlockNumber = disputeDeadline + 1n;

            await actor.onLastBlockUpdated(newBlockNumber);

            expect(mockSettleDispute).toHaveBeenCalledWith(
                request.prophetData,
                response.prophetData,
                dispute.prophetData,
            );
        });

        it("escalates dispute if cannot settle", async () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const { disputeModuleData } = request.prophetData;

            const response = mocks.buildResponse(request, { id: "0x10" });
            const dispute = mocks.buildDispute(request, response, { createdAt: 1n });
            const disputeDeadline =
                disputeModuleData.bondEscalationDeadline + disputeModuleData.tyingBuffer;

            const { actor, registry, protocolProvider } = mocks.buildEboActor(request, logger);

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponse").mockImplementation((id) => {
                switch (id) {
                    case response.id:
                        return response;
                }
            });
            // Skipping finalize flow with this mock
            vi.spyOn(registry, "getResponses").mockReturnValue([]);
            vi.spyOn(registry, "getDisputes").mockReturnValue([dispute]);

            const error = Object.create(ContractFunctionRevertedError.prototype);
            error.data = { errorName: "BondEscalationModule_ShouldBeEscalated" };

            const mockSettleDispute = vi
                .spyOn(protocolProvider, "settleDispute")
                .mockImplementation(async () => {
                    throw error;
                });

            const mockEscalateDispute = vi
                .spyOn(protocolProvider, "escalateDispute")
                .mockImplementation(() => Promise.resolve());

            const newBlockNumber = disputeDeadline + 1n;

            await actor.onLastBlockUpdated(newBlockNumber);

            expect(mockSettleDispute).toHaveBeenCalledWith(
                request.prophetData,
                response.prophetData,
                dispute.prophetData,
            );

            expect(mockEscalateDispute).toHaveBeenCalledWith(
                request.prophetData,
                response.prophetData,
                dispute.prophetData,
            );
        });

        it("throws if the dispute has no response in registry", async () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const { disputeModuleData } = request.prophetData;

            const response = mocks.buildResponse(request, { id: "0x10" });
            const dispute = mocks.buildDispute(request, response, { createdAt: 1n });
            const disputeDeadline =
                disputeModuleData.bondEscalationDeadline + disputeModuleData.tyingBuffer;

            const { actor, registry } = mocks.buildEboActor(request, logger);

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponse").mockReturnValue(undefined);
            // Skipping finalize flow with this mock
            vi.spyOn(registry, "getResponses").mockReturnValue([]);
            vi.spyOn(registry, "getDisputes").mockReturnValue([dispute]);

            const newBlockNumber = disputeDeadline + 1n;

            expect(actor.onLastBlockUpdated(newBlockNumber)).rejects.toThrow(
                DisputeWithoutResponse,
            );
        });

        it.skip("notifies dispute escalation");

        it("logs and returns when response deadline has not been reached", async () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const response = mocks.buildResponse(request, { id: "0x10" });

            const { responseModuleData } = request.prophetData;
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

            await actor.onLastBlockUpdated(newBlockNumber);

            expect(logger.debug).toBeCalledWith(
                expect.stringMatching(`Proposal window for request ${request.id} not closed yet.`),
            );

            expect(mockFinalize).not.toHaveBeenCalled();
        });

        it("finalizes the request using the first accepted response", async () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const firstResponse = mocks.buildResponse(request, { id: "0x10", createdAt: 5n });
            const firstResponseDispute = mocks.buildDispute(request, firstResponse, {
                status: "Lost",
            });
            const secondResponse = mocks.buildResponse(request, { id: "0x11", createdAt: 10n });

            const { actor, registry, protocolProvider } = mocks.buildEboActor(request, logger);

            const reverseResponses = [secondResponse, firstResponse];

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponses").mockReturnValue(reverseResponses);
            vi.spyOn(registry, "getDispute").mockReturnValue(firstResponseDispute);

            const mockFinalize = vi.spyOn(protocolProvider, "finalize").mockImplementation(() => {
                return Promise.resolve();
            });

            const newBlock =
                secondResponse.createdAt + request.prophetData.responseModuleData.disputeWindow;

            await actor.onLastBlockUpdated(newBlock + 1n);

            expect(mockFinalize).toHaveBeenCalledWith(
                request.prophetData,
                firstResponse.prophetData,
            );
        });
    });
});
