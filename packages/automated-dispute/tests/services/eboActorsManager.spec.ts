import { BlockNumberService, Caip2ChainId } from "@ebo-agent/blocknumber";
import { ILogger } from "@ebo-agent/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RequestAlreadyHandled } from "../../src/exceptions/index.js";
import { ProtocolProvider } from "../../src/providers/index.js";
import { EboActorsManager, NotificationService } from "../../src/services/index.js";
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
    let notifier: NotificationService;

    beforeEach(() => {
        vi.clearAllMocks();

        notifier = {
            notifyError: vi.fn().mockResolvedValue(undefined),
        };

        protocolProvider = new ProtocolProvider(
            {
                l1: {
                    chainId: "eip155:1",
                    urls: ["http://localhost:8538"],
                    retryInterval: 1,
                    timeout: 100,
                    transactionReceiptConfirmations: 1,
                },
                l2: {
                    chainId: "eip155:42161",
                    urls: ["http://localhost:8539"],
                    retryInterval: 1,
                    timeout: 100,
                    transactionReceiptConfirmations: 1,
                },
            },
            DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
            mockedPrivateKey,
        );

        blockNumberService = new BlockNumberService(
            new Map<Caip2ChainId, string[]>([[chainId, ["http://localhost:8539"]]]),
            {
                baseUrl: new URL("http://localhost"),
                bearerToken: "secret-token",
                bearerTokenExpirationWindow: 10,
                servicePaths: {
                    block: "/block",
                    blockByTime: "/blockbytime",
                },
            },
            logger,
        );
    });

    describe("createActor", () => {
        it("creates the actor", () => {
            const actorsManager = new EboActorsManager();
            const actor = actorsManager.createActor(
                actorRequest,
                protocolProvider,
                blockNumberService,
                logger,
                notifier,
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

            actorsManager.createActor(
                actorRequest,
                protocolProvider,
                blockNumberService,
                logger,
                notifier,
            );

            const actor = actorsManager.getActor(request.id);

            expect(actor).toBeDefined();
        });

        it("throws if the request has already an actor linked to it", () => {
            const actorsManager = new EboActorsManager();

            actorsManager.createActor(
                actorRequest,
                protocolProvider,
                blockNumberService,
                logger,
                notifier,
            );

            expect(() => {
                actorsManager.createActor(
                    actorRequest,
                    protocolProvider,
                    blockNumberService,
                    logger,
                    notifier,
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

            actorsManager.createActor(
                actorRequest,
                protocolProvider,
                blockNumberService,
                logger,
                notifier,
            );

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

            actorsManager.createActor(
                actorRequest,
                protocolProvider,
                blockNumberService,
                logger,
                notifier,
            );

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
