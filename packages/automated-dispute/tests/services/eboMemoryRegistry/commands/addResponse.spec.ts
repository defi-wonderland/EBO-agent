import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { CommandAlreadyRun, CommandNotRun } from "../../../../src/exceptions/index.js";
import { EboRegistry } from "../../../../src/interfaces/index.js";
import { AddResponse } from "../../../../src/services/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../../../eboActor/fixtures.js";
import mocks from "../../../mocks/index.js";

describe("AddResponse", () => {
    let registry: EboRegistry;

    beforeEach(() => {
        registry = {
            addResponse: vi.fn(),
            removeResponse: vi.fn(),
        } as unknown as EboRegistry;
    });

    describe("run", () => {
        it("adds the response to the registry", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const response = mocks.buildResponse(request);
            const command = new AddResponse(registry, response);

            const mockAddRequest = registry.addResponse as Mock;

            command.run();

            expect(mockAddRequest).toHaveBeenCalledWith(response);
        });

        it("throws if the command was already run", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const response = mocks.buildResponse(request);
            const command = new AddResponse(registry, response);

            command.run();

            expect(() => command.run()).toThrow(CommandAlreadyRun);
        });
    });

    describe("undo", () => {
        it("removes the response request", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const response = mocks.buildResponse(request);
            const command = new AddResponse(registry, response);

            const mockRemoveRequest = registry.removeResponse as Mock;

            command.run();
            command.undo();

            expect(mockRemoveRequest).toHaveBeenCalledWith(response.id);
        });

        it("throws if undoing the command before being run", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const response = mocks.buildResponse(request);
            const command = new AddResponse(registry, response);

            expect(() => command.undo()).toThrow(CommandNotRun);
        });
    });
});
