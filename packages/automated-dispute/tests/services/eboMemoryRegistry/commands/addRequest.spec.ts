import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { CommandAlreadyRun, CommandNotRun } from "../../../../src/exceptions/index.js";
import { EboRegistry } from "../../../../src/interfaces/index.js";
import { AddRequest } from "../../../../src/services/index.js";
import { EboEvent } from "../../../../src/types/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../../../eboActor/fixtures.js";

describe("AddRequest", () => {
    let registry: EboRegistry;

    const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
    const event: EboEvent<"RequestCreated"> = {
        name: "RequestCreated",
        blockNumber: 1n,
        logIndex: 1,
        requestId: request.id,
        metadata: {
            chainId: request.chainId,
            epoch: request.epoch,
            request: request.prophetData,
            requestId: request.id,
        },
    };

    beforeEach(() => {
        registry = {
            addRequest: vi.fn(),
            removeRequest: vi.fn(),
        } as unknown as EboRegistry;
    });

    describe("run", () => {
        it("adds the request to the registry", () => {
            const command = AddRequest.buildFromEvent(event, registry);

            const mockAddRequest = registry.addRequest as Mock;

            command.run();

            expect(mockAddRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: request.id,
                }),
            );
        });

        it("throws if the command was already run", () => {
            const command = AddRequest.buildFromEvent(event, registry);

            command.run();

            expect(() => command.run()).toThrow(CommandAlreadyRun);
        });
    });

    describe("undo", () => {
        it("removes the added request", () => {
            const command = AddRequest.buildFromEvent(event, registry);

            const mockRemoveRequest = registry.removeRequest as Mock;

            command.run();
            command.undo();

            expect(mockRemoveRequest).toHaveBeenCalledWith(request.id);
        });

        it("throws if undoing the command before being run", () => {
            const command = AddRequest.buildFromEvent(event, registry);

            expect(() => command.undo()).toThrow(CommandNotRun);
        });
    });
});
