import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { CommandAlreadyRun, CommandNotRun } from "../../../../src/exceptions/index.js";
import { EboRegistry } from "../../../../src/interfaces/index.js";
import { AddDispute } from "../../../../src/services/index.js";
import { EboEvent } from "../../../../src/types/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../../../eboActor/fixtures.js";
import mocks from "../../../mocks/index.js";

describe("AddDispute", () => {
    let registry: EboRegistry;

    const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
    const response = mocks.buildResponse(request);
    const dispute = mocks.buildDispute(request, response);

    const event: EboEvent<"ResponseDisputed"> = {
        name: "ResponseDisputed",
        blockNumber: 1n,
        logIndex: 1,
        requestId: request.id,
        metadata: {
            dispute: dispute.prophetData,
            disputeId: dispute.id,
            responseId: response.id,
        },
    };

    beforeEach(() => {
        registry = {
            addDispute: vi.fn(),
            removeDispute: vi.fn(),
        } as unknown as EboRegistry;
    });

    describe("run", () => {
        it("adds the dispute to the registry", () => {
            const command = AddDispute.buildFromEvent(event, registry);

            command.run();

            expect(registry.addDispute).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: dispute.id,
                }),
            );
        });

        it("throws if the command was already run", () => {
            const command = AddDispute.buildFromEvent(event, registry);

            command.run();

            expect(() => command.run()).toThrow(CommandAlreadyRun);
        });
    });

    describe("undo", () => {
        it("removes the added request", () => {
            const command = AddDispute.buildFromEvent(event, registry);

            const mockRemoveDispute = registry.removeDispute as Mock;

            command.run();
            command.undo();

            expect(mockRemoveDispute).toHaveBeenCalledWith(request.id);
        });

        it("throws if undoing the command before being run", () => {
            const command = AddDispute.buildFromEvent(event, registry);

            expect(() => command.undo()).toThrow(CommandNotRun);
        });
    });
});
