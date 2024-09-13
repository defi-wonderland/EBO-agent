import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommandAlreadyRun, CommandNotRun } from "../../../../src/exceptions/index.js";
import { EboRegistry } from "../../../../src/interfaces/index.js";
import { FinalizeRequest } from "../../../../src/services/index.js";
import { EboEvent } from "../../../../src/types/index.js";
import mocks from "../../../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../../../services/eboActor/fixtures.js";

describe("FinalizeRequest", () => {
    let registry: EboRegistry;

    const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
    const response = mocks.buildResponse(request);

    const event: EboEvent<"RequestFinalized"> = {
        name: "RequestFinalized",
        blockNumber: response.createdAt + 1n,
        logIndex: 1,
        requestId: request.id,
        metadata: {
            requestId: request.id,
            responseId: response.id,
            blockNumber: response.createdAt + 1n,
            caller: "0x01",
        },
    };

    beforeEach(() => {
        registry = {
            getRequest: vi.fn().mockReturnValue(request),
            updateRequestStatus: vi.fn(),
        } as unknown as EboRegistry;
    });

    describe("run", () => {
        it("changes the request state", () => {
            const command = FinalizeRequest.buildFromEvent(event, registry);

            command.run();

            expect(registry.updateRequestStatus).toHaveBeenCalledWith(request.id, "Finalized");
        });

        it("throws if the command was already run", () => {
            const command = FinalizeRequest.buildFromEvent(event, registry);

            command.run();

            expect(() => command.run()).toThrow(CommandAlreadyRun);
        });
    });

    describe("undo", () => {
        it("reverts the request status", () => {
            const command = FinalizeRequest.buildFromEvent(event, registry);
            const firstStatus = request.status;

            command.run();
            command.undo();

            expect(registry.updateRequestStatus).toHaveBeenNthCalledWith(
                1,
                request.id,
                "Finalized",
            );

            expect(registry.updateRequestStatus).toHaveBeenNthCalledWith(
                2,
                request.id,
                firstStatus,
            );
        });

        it("throws if undoing the command before being run", () => {
            const command = FinalizeRequest.buildFromEvent(event, registry);

            expect(() => command.undo()).toThrow(CommandNotRun);
        });
    });
});
