import { ILogger } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { InvalidActorState } from "../../src/exceptions/invalidActorState.exception.js";
import { EboEvent } from "../../src/types/events.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.js";
import mocks from "./mocks/index.js";

const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

describe("EboActor", () => {
    describe("onRequestFinalized", () => {
        const actorRequest = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

        const event: EboEvent<"RequestFinalized"> = {
            name: "RequestFinalized",
            blockNumber: 1n,
            logIndex: 1,
            metadata: {
                blockNumber: 1n,
                caller: "0x01",
                requestId: actorRequest.id,
                responseId: "0x02",
            },
        };

        it("executes the actor's callback during termination", async () => {
            const { actor, onTerminate, registry } = mocks.buildEboActor(actorRequest, logger);

            vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

            onTerminate.mockImplementation(() => Promise.resolve());

            await actor.onRequestFinalized(event);

            expect(onTerminate).toHaveBeenCalledWith(actorRequest);
        });

        it("throws if the event's request is not handled by actor", () => {
            const { actor } = mocks.buildEboActor(actorRequest, logger);

            const otherRequestEvent = {
                ...event,
                metadata: {
                    ...event.metadata,
                    requestId: actorRequest.id + "123",
                },
            };

            expect(actor.onRequestFinalized(otherRequestEvent)).rejects.toThrow(InvalidActorState);
        });

        // The one who defines the callback is responsible for handling callback errors
        it("throws if the callback throws", () => {
            const { actor, onTerminate } = mocks.buildEboActor(actorRequest, logger);

            onTerminate.mockImplementation(() => {
                throw new Error();
            });

            expect(actor.onRequestFinalized(event)).rejects.toThrow(InvalidActorState);
        });
    });
});
