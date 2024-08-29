import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { CommandAlreadyRun, CommandNotRun } from "../../../../src/exceptions/index.js";
import { EboRegistry } from "../../../../src/interfaces/index.js";
import { AddRequest } from "../../../../src/services/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../../../eboActor/fixtures.js";

describe("AddRequest", () => {
    let registry: EboRegistry;

    beforeEach(() => {
        registry = {
            addRequest: vi.fn(),
            removeRequest: vi.fn(),
        } as unknown as EboRegistry;
    });

    describe("run", () => {
        it("adds the request to the registry", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const command = new AddRequest(registry, request);

            const mockAddRequest = registry.addRequest as Mock;

            command.run();

            expect(mockAddRequest).toHaveBeenCalledWith(request);
        });

        it("throws if the command was already run", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const command = new AddRequest(registry, request);

            command.run();

            expect(() => command.run()).toThrow(CommandAlreadyRun);
        });
    });

    describe("undo", () => {
        it("removes the added request", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const command = new AddRequest(registry, request);

            const mockRemoveRequest = registry.removeRequest as Mock;

            command.run();
            command.undo();

            expect(mockRemoveRequest).toHaveBeenCalledWith(request.id);
        });

        it("throws if undoing the command before being run", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const command = new AddRequest(registry, request);

            expect(() => command.undo()).toThrow(CommandNotRun);
        });
    });
});
