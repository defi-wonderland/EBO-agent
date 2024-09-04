import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommandAlreadyRun, CommandNotRun } from "../../../../src/exceptions/index.js";
import { EboRegistry } from "../../../../src/interfaces/index.js";
import { UpdateDisputeStatus } from "../../../../src/services/index.js";
import { EboEvent } from "../../../../src/types/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../../../eboActor/fixtures.js";
import mocks from "../../../mocks/index.js";

describe("UpdateDisputeStatus", () => {
    let registry: EboRegistry;

    const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
    const response = mocks.buildResponse(request);
    const dispute = mocks.buildDispute(request, response);

    const event: EboEvent<"DisputeStatusChanged"> = {
        name: "DisputeStatusChanged",
        blockNumber: 1n,
        logIndex: 1,
        requestId: request.id,
        metadata: {
            blockNumber: 1n,
            dispute: dispute.prophetData,
            disputeId: dispute.id,
            status: dispute.status === "Active" ? "Lost" : "Active",
        },
    };

    beforeEach(() => {
        registry = {
            getDispute: vi.fn().mockReturnValue(dispute),
            updateDisputeStatus: vi.fn(),
        } as unknown as EboRegistry;
    });

    describe("run", () => {
        it("updates the dispute status in the registry", () => {
            const command = UpdateDisputeStatus.buildFromEvent(event, registry);

            command.run();

            expect(registry.updateDisputeStatus).toHaveBeenCalledWith(
                event.metadata.disputeId,
                event.metadata.status,
            );
        });

        it("escalates when the event is DisputeEscalated", () => {
            const escalatedDisputeEvent: EboEvent<"DisputeEscalated"> = {
                ...event,
                name: "DisputeEscalated",
                metadata: {
                    disputeId: "0x01",
                    blockNumber: event.blockNumber,
                    caller: "0x01",
                },
            };

            const command = UpdateDisputeStatus.buildFromEvent(escalatedDisputeEvent, registry);

            command.run();

            expect(registry.updateDisputeStatus).toHaveBeenCalledWith(
                event.metadata.disputeId,
                "Escalated",
            );
        });

        it("throws if the command was already run", () => {
            const command = UpdateDisputeStatus.buildFromEvent(event, registry);

            command.run();

            expect(() => command.run()).toThrow(CommandAlreadyRun);
        });
    });

    describe("undo", () => {
        it("reverts the dispute status to the previous status", () => {
            const command = UpdateDisputeStatus.buildFromEvent(event, registry);

            const previousStatus = dispute.status;

            command.run();
            command.undo();

            expect(registry.updateDisputeStatus).toHaveBeenCalledTimes(2);
            expect(registry.updateDisputeStatus).toHaveBeenNthCalledWith(
                2,
                event.metadata.disputeId,
                previousStatus,
            );
        });

        it("throws if undoing the command before being run", () => {
            const command = UpdateDisputeStatus.buildFromEvent(event, registry);

            expect(() => command.undo()).toThrow(CommandNotRun);
        });
    });
});
