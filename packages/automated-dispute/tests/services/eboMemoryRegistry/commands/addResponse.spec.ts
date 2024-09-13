import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { CommandAlreadyRun, CommandNotRun } from "../../../../src/exceptions/index.js";
import { EboRegistry } from "../../../../src/interfaces/index.js";
import { AddResponse } from "../../../../src/services/index.js";
import { EboEvent } from "../../../../src/types/index.js";
import mocks from "../../../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../../../services/eboActor/fixtures.js";

describe("AddResponse", () => {
    let registry: EboRegistry;

    const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
    const response = mocks.buildResponse(request);
    const event: EboEvent<"ResponseProposed"> = {
        name: "ResponseProposed",
        blockNumber: response.createdAt,
        logIndex: 1,
        requestId: request.id,
        metadata: {
            requestId: request.id,
            responseId: response.id,
            response: response.prophetData,
        },
    };

    beforeEach(() => {
        registry = {
            addResponse: vi.fn(),
            removeResponse: vi.fn(),
        } as unknown as EboRegistry;
    });

    describe("run", () => {
        it("adds the response to the registry", () => {
            const command = AddResponse.buildFromEvent(event, registry);

            const mockAddRequest = registry.addResponse as Mock;

            command.run();

            expect(mockAddRequest).toHaveBeenCalledWith(response);
        });

        it("throws if the command was already run", () => {
            const command = AddResponse.buildFromEvent(event, registry);

            command.run();

            expect(() => command.run()).toThrow(CommandAlreadyRun);
        });
    });

    describe("undo", () => {
        it("removes the response request", () => {
            const command = AddResponse.buildFromEvent(event, registry);

            const mockRemoveRequest = registry.removeResponse as Mock;

            command.run();
            command.undo();

            expect(mockRemoveRequest).toHaveBeenCalledWith(response.id);
        });

        it("throws if undoing the command before being run", () => {
            const command = AddResponse.buildFromEvent(event, registry);

            expect(() => command.undo()).toThrow(CommandNotRun);
        });
    });
});
