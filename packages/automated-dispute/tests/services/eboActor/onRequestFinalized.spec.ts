import { ILogger } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { FinalizeRequest } from "../../../src/services/index.js";
import { EboEvent, ResponseId } from "../../../src/types/index.js";
import mocks from "../../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.js";

const logger: ILogger = mocks.mockLogger();

describe("EboActor", () => {
    describe("processEvents", () => {
        describe("when OracleRequestFinalized is enqueued", () => {
            const actorRequest = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

            const event: EboEvent<"OracleRequestFinalized"> = {
                name: "OracleRequestFinalized",
                requestId: actorRequest.id,
                blockNumber: 1n,
                logIndex: 1,
                metadata: {
                    blockNumber: 1n,
                    caller: "0x01",
                    requestId: actorRequest.id,
                    responseId: "0x02" as ResponseId,
                },
            };

            it("logs a message during request finalization", async () => {
                const { actor, registry } = mocks.buildEboActor(actorRequest, logger);

                vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

                const mockInfo = vi.spyOn(logger, "info");

                actor.enqueue(event);

                await actor.processEvents();

                expect(mockInfo).toHaveBeenCalledWith(
                    expect.stringMatching(`Request ${actorRequest.id} has been finalized.`),
                );
            });

            it("uses the FinalizeRequest registry command", async () => {
                const { actor, registry } = mocks.buildEboActor(actorRequest, logger);

                vi.spyOn(registry, "getRequest").mockReturnValue(actorRequest);

                const mockFinalizeRequest = {
                    run: vi.fn(),
                    undo: vi.fn(),
                } as unknown as FinalizeRequest;

                const mockBuildFromEvent = vi
                    .spyOn(FinalizeRequest, "buildFromEvent")
                    .mockReturnValue(mockFinalizeRequest);

                actor.enqueue(event);

                await actor.processEvents();

                expect(mockBuildFromEvent).toHaveBeenCalledWith(event, registry);
                expect(mockFinalizeRequest.run).toHaveBeenCalled();
            });
        });
    });
});
