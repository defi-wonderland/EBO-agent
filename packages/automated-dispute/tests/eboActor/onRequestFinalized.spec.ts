import { ILogger } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { InvalidActorState } from "../../src/exceptions/invalidActorState.exception.js";
import { EboEvent } from "../../src/types/events.js";
import mocks from "../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.js";

const logger: ILogger = mocks.mockLogger();

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

        it("logs a message during request finalization", async () => {
            const { actor, registry } = mocks.buildEboActor(actorRequest, logger);

            vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

            const mockInfo = vi.spyOn(logger, "info");

            await actor.onRequestFinalized(event);

            expect(mockInfo).toHaveBeenCalledWith(
                expect.stringMatching(`Request ${actorRequest.id} has been finalized.`),
            );
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
    });
});
