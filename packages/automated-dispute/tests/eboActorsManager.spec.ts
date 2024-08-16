import { ILogger } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { EboActorsManager } from "../src/eboActorsManager.js";
import { RequestAlreadyHandled } from "../src/exceptions/requestAlreadyHandled.exception.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./eboActor/fixtures.js";
import mocks from "./mocks/index.js";

const logger: ILogger = mocks.mockLogger();

describe("EboActorsManager", () => {
    describe("registerActor", () => {
        it("registers the actor correctly", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const { actor } = mocks.buildEboActor(request, logger);
            const actorsManager = new EboActorsManager();
            const mockSetRequestActorMap = vi.spyOn(actorsManager["requestActorMap"], "set");

            actorsManager.registerActor(request.id, actor);

            expect(mockSetRequestActorMap).toHaveBeenCalledWith(request.id, actor);
        });

        it("throws if the request has already an actor linked to it", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const { actor: firstActor } = mocks.buildEboActor(request, logger);
            const { actor: secondActor } = mocks.buildEboActor(request, logger);
            const actorsManager = new EboActorsManager();

            actorsManager.registerActor(request.id, firstActor);

            expect(() => actorsManager.registerActor(request.id, secondActor)).toThrowError(
                RequestAlreadyHandled,
            );
        });
    });

    describe("getActor", () => {
        it("returns undefined if the request is not linked to any actor", () => {
            const actorsManager = new EboActorsManager();

            expect(actorsManager.getActor("0x9999")).toBeUndefined();
        });

        it("returns the request's linked actor", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const { actor } = mocks.buildEboActor(request, logger);
            const actorsManager = new EboActorsManager();

            actorsManager.registerActor(request.id, actor);

            expect(actorsManager.getActor(request.id)).toBe(actor);
        });
    });

    describe("deleteActor", () => {
        it("deletes the actor linked to the request", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const { actor } = mocks.buildEboActor(request, logger);
            const actorsManager = new EboActorsManager();

            actorsManager.registerActor(request.id, actor);

            expect(actorsManager.getActor(request.id)).toBe(actor);

            actorsManager.deleteActor(request.id);

            expect(actorsManager.getActor(request.id)).toBeUndefined();
        });

        it("returns false if the request has no actors linked", () => {
            const requestId = "0x01";
            const actorsManager = new EboActorsManager();

            expect(actorsManager.getActor(requestId)).toBeUndefined();
            expect(actorsManager.deleteActor(requestId)).toEqual(false);
        });
    });
});
