import { beforeEach } from "node:test";
import { BlockNumberService, Caip2ChainId } from "@ebo-agent/blocknumber";
import { ILogger } from "@ebo-agent/shared";
import { describe, expect, it } from "vitest";

import { RequestAlreadyHandled } from "../../src/exceptions/index.js";
import { ProtocolProvider } from "../../src/providers/index.js";
import { EboActorsManager } from "../../src/services/index.js";
import mocks from "../mocks/index.js";
import {
    DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
    DEFAULT_MOCKED_REQUEST_CREATED_DATA,
    mockedPrivateKey,
} from "./eboActor/fixtures.js";

const logger: ILogger = mocks.mockLogger();

describe("EboActorsManager", () => {
    const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
    const actorRequest = {
        id: request.id,
        epoch: request.epoch,
    };
    const chainId = request.chainId;

    let protocolProvider: ProtocolProvider;
    let blockNumberService: BlockNumberService;

    beforeEach(() => {
        const protocolProviderRpcUrls = ["http://localhost:8538"];
        protocolProvider = new ProtocolProvider(
            protocolProviderRpcUrls,
            DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
            mockedPrivateKey,
        );

        const blockNumberRpcUrls = new Map<Caip2ChainId, string[]>([
            [chainId, ["http://localhost:8539"]],
        ]);
        blockNumberService = new BlockNumberService(blockNumberRpcUrls, logger);
    });

    describe("createActor", () => {
        it("creates the actor", () => {
            const actorsManager = new EboActorsManager();
            const actor = actorsManager.createActor(
                actorRequest,
                protocolProvider,
                blockNumberService,
                logger,
            );

            expect(actor).toMatchObject({
                actorRequest: expect.objectContaining({
                    id: request.id,
                    epoch: request.epoch,
                }),
            });
        });

        it("registers the actor to be fetchable by id", () => {
            const actorsManager = new EboActorsManager();

            expect(actorsManager.getActor(request.id)).toBeUndefined();

            actorsManager.createActor(actorRequest, protocolProvider, blockNumberService, logger);

            const actor = actorsManager.getActor(request.id);

            expect(actor).toBeDefined();
        });

        it("throws if the request has already an actor linked to it", () => {
            const actorsManager = new EboActorsManager();

            actorsManager.createActor(actorRequest, protocolProvider, blockNumberService, logger);

            expect(() => {
                actorsManager.createActor(
                    actorRequest,
                    protocolProvider,
                    blockNumberService,
                    logger,
                );
            }).toThrowError(RequestAlreadyHandled);
        });
    });

    describe("getActor", () => {
        it("returns undefined if the request is not linked to any actor", () => {
            const actorsManager = new EboActorsManager();

            expect(actorsManager.getActor("0x9999")).toBeUndefined();
        });

        it("returns the request's linked actor", () => {
            const actorsManager = new EboActorsManager();

            actorsManager.createActor(actorRequest, protocolProvider, blockNumberService, logger);

            const actor = actorsManager.getActor(request.id);

            expect(actor).toMatchObject({
                actorRequest: expect.objectContaining({
                    id: request.id,
                    epoch: request.epoch,
                }),
            });
        });
    });

    describe("deleteActor", () => {
        it("deletes the actor linked to the request", () => {
            const actorsManager = new EboActorsManager();

            actorsManager.createActor(actorRequest, protocolProvider, blockNumberService, logger);

            expect(actorsManager.getActor(request.id)).toBeDefined();

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
