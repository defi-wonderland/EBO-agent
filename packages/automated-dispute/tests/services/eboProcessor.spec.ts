import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessorAlreadyStarted } from "../../src/exceptions/index.js";
import { ProtocolProvider } from "../../src/protocolProvider.js";
import { EboEvent, EboEventName } from "../../src/types/events.js";
import { RequestId } from "../../src/types/prophet.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../eboActor/fixtures.js";
import mocks from "../mocks/index.js";

const logger = mocks.mockLogger();
const msBetweenChecks = 1;

describe("EboProcessor", () => {
    describe("start", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("bootstraps actors with onchain active requests when starting", async () => {
            const { processor, actorsManager, protocolProvider } = mocks.buildEboProcessor(logger);

            const currentEpoch = {
                currentEpoch: 1n,
                currentEpochBlockNumber: 1n,
                currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
            };

            const requestCreatedEvent: EboEvent<"RequestCreated"> = {
                name: "RequestCreated",
                blockNumber: 1n,
                logIndex: 1,
                requestId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.id,
                metadata: {
                    requestId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.id,
                    epoch: DEFAULT_MOCKED_REQUEST_CREATED_DATA.epoch,
                    chainId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.chainId,
                    request: DEFAULT_MOCKED_REQUEST_CREATED_DATA["prophetData"],
                },
            };

            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(
                currentEpoch.currentEpochBlockNumber + 10n,
            );
            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue([requestCreatedEvent]);

            const mockCreateActor = vi.spyOn(actorsManager, "createActor");

            await processor.start(msBetweenChecks);

            const expectedNewActor = expect.objectContaining({
                id: requestCreatedEvent.requestId,
                epoch: currentEpoch.currentEpoch,
            });

            expect(mockCreateActor).toHaveBeenCalledWith(
                expectedNewActor,
                expect.any(ProtocolProvider),
                expect.any(BlockNumberService),
                logger,
            );
        });

        it("throws if called more than once", async () => {
            const { processor, protocolProvider } = mocks.buildEboProcessor(logger);

            const currentEpoch = {
                currentEpoch: 1n,
                currentEpochBlockNumber: 1n,
                currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
            };

            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(
                currentEpoch.currentEpochBlockNumber + 10n,
            );
            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue([]);

            await processor.start(1);
            expect(processor.start(1)).rejects.toThrow(ProcessorAlreadyStarted);
        });

        it("fetches events since epoch start when starting", async () => {
            const { processor, protocolProvider } = mocks.buildEboProcessor(logger);

            const currentEpoch = {
                currentEpoch: 1n,
                currentEpochBlockNumber: 1n,
                currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
            };

            const currentBlock = currentEpoch.currentEpochBlockNumber + 10n;

            const requestCreatedEvent: EboEvent<"RequestCreated"> = {
                name: "RequestCreated",
                blockNumber: 1n,
                logIndex: 1,
                requestId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.id,
                metadata: {
                    requestId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.id,
                    epoch: DEFAULT_MOCKED_REQUEST_CREATED_DATA.epoch,
                    chainId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.chainId,
                    request: DEFAULT_MOCKED_REQUEST_CREATED_DATA["prophetData"],
                },
            };

            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(currentBlock);

            const mockGetEvents = vi.spyOn(protocolProvider, "getEvents");
            mockGetEvents.mockResolvedValue([requestCreatedEvent]);

            await processor.start(msBetweenChecks);

            expect(mockGetEvents).toHaveBeenCalledWith(
                currentEpoch.currentEpochBlockNumber,
                currentBlock,
            );
        });

        it("fetches events since last block checked after first events fetch", async () => {
            const { processor, protocolProvider } = mocks.buildEboProcessor(logger);

            const mockLastCheckedBlock = 5n;
            processor["lastCheckedBlock"] = mockLastCheckedBlock;

            const currentEpoch = {
                currentEpoch: 1n,
                currentEpochBlockNumber: 1n,
                currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
            };

            const currentBlock = currentEpoch.currentEpochBlockNumber + 10n;

            const requestCreatedEvent: EboEvent<"RequestCreated"> = {
                name: "RequestCreated",
                blockNumber: 6n,
                logIndex: 1,
                requestId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.id,
                metadata: {
                    requestId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.id,
                    epoch: DEFAULT_MOCKED_REQUEST_CREATED_DATA.epoch,
                    chainId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.chainId,
                    request: DEFAULT_MOCKED_REQUEST_CREATED_DATA["prophetData"],
                },
            };

            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(currentBlock);

            const mockGetEvents = vi.spyOn(protocolProvider, "getEvents");
            mockGetEvents.mockResolvedValue([requestCreatedEvent]);

            processor["lastCheckedBlock"] = mockLastCheckedBlock;

            await processor.start(msBetweenChecks);

            expect(mockGetEvents).toHaveBeenCalledWith(mockLastCheckedBlock, currentBlock);
        });

        it("enqueues and process every new event into the actor", async () => {
            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(logger);

            const currentEpoch = {
                currentEpoch: 1n,
                currentEpochBlockNumber: 1n,
                currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
            };

            const currentBlock = currentEpoch.currentEpochBlockNumber + 10n;

            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(currentBlock);

            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const response = mocks.buildResponse(request);

            const eventStream: EboEvent<EboEventName>[] = [
                {
                    name: "RequestCreated",
                    blockNumber: 6n,
                    logIndex: 1,
                    requestId: request.id,
                    metadata: {
                        requestId: request.id,
                        epoch: request.epoch,
                        chainId: request.chainId,
                        request: request["prophetData"],
                    },
                },
                {
                    name: "ResponseProposed",
                    blockNumber: 7n,
                    logIndex: 1,
                    requestId: request.id,
                    metadata: {
                        requestId: request.id,
                        responseId: response.id,
                        response: response.prophetData,
                    },
                },
            ];

            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue(eventStream);

            const { actor } = mocks.buildEboActor(request, logger);

            const mockActorEnqueue = vi.spyOn(actor, "enqueue");
            const mockActorProcessEvents = vi
                .spyOn(actor, "processEvents")
                .mockImplementation(() => Promise.resolve());

            vi.spyOn(actor, "onLastBlockUpdated").mockImplementation(() => {});

            vi.spyOn(actorsManager, "createActor").mockResolvedValue(actor);
            vi.spyOn(actorsManager, "getActor").mockReturnValue(actor);

            await processor.start(msBetweenChecks);

            expect(mockActorProcessEvents).toHaveBeenCalledOnce();
            expect(mockActorEnqueue).toHaveBeenCalledTimes(2);
        });

        it("enqueues events into corresponding actors", async () => {
            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(logger);

            const currentEpoch = {
                currentEpoch: 1n,
                currentEpochBlockNumber: 1n,
                currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
            };

            const currentBlock = currentEpoch.currentEpochBlockNumber + 10n;

            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(currentBlock);

            const request1 = {
                ...DEFAULT_MOCKED_REQUEST_CREATED_DATA,
                id: "0x01" as RequestId,
                chainId: "eip155:1" as Caip2ChainId,
            };
            const response1 = mocks.buildResponse(request1);

            const request2 = {
                ...DEFAULT_MOCKED_REQUEST_CREATED_DATA,
                id: "0x02" as RequestId,
                chainId: "eip155:137" as Caip2ChainId,
            };
            const response2 = mocks.buildResponse(request2);

            const eventStream: EboEvent<EboEventName>[] = [
                {
                    name: "ResponseProposed",
                    blockNumber: 7n,
                    logIndex: 1,
                    requestId: request1.id,
                    metadata: {
                        requestId: request1.id,
                        responseId: response1.id,
                        response: response1.prophetData,
                    },
                },
                {
                    name: "ResponseProposed",
                    blockNumber: 7n,
                    logIndex: 2,
                    requestId: request2.id,
                    metadata: {
                        requestId: request2.id,
                        responseId: response2.id,
                        response: response2.prophetData,
                    },
                },
            ];

            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue(eventStream);

            const { actor: actor1 } = mocks.buildEboActor(request1, logger);
            const { actor: actor2 } = mocks.buildEboActor(request2, logger);

            const mockActor1Enqueue = vi.spyOn(actor1, "enqueue");
            const mockActor2Enqueue = vi.spyOn(actor2, "enqueue");

            mockActor1Enqueue.mockImplementation(() => {});
            mockActor2Enqueue.mockImplementation(() => {});

            vi.spyOn(actor1, "processEvents").mockImplementation(() => Promise.resolve());
            vi.spyOn(actor2, "processEvents").mockImplementation(() => Promise.resolve());

            vi.spyOn(actor1, "onLastBlockUpdated").mockImplementation(() => {});
            vi.spyOn(actor2, "onLastBlockUpdated").mockImplementation(() => {});

            vi.spyOn(actorsManager, "getActor").mockImplementation((requestId: RequestId) => {
                switch (requestId) {
                    case request1.id:
                        return actor1;

                    case request2.id:
                        return actor2;

                    default:
                        return undefined;
                }
            });

            await processor.start(msBetweenChecks);

            expect(mockActor1Enqueue).toHaveBeenCalledWith(eventStream[0]);
            expect(mockActor2Enqueue).toHaveBeenCalledWith(eventStream[1]);
        });

        it.skip("notifies if an actor throws while handling events");

        it("removes the actor from registry when terminating", async () => {
            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(logger);

            const currentEpoch = {
                currentEpoch: 1n,
                currentEpochBlockNumber: 1n,
                currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
            };

            const currentBlock = currentEpoch.currentEpochBlockNumber + 10n;

            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(currentBlock);

            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue([]);

            const { actor } = mocks.buildEboActor(request, logger);

            vi.spyOn(actor, "onLastBlockUpdated").mockImplementation(() => {});
            vi.spyOn(actor, "canBeTerminated").mockReturnValue(true);

            vi.spyOn(actorsManager, "createActor").mockResolvedValue(actor);
            vi.spyOn(actorsManager, "getActor").mockReturnValue(actor);
            vi.spyOn(actorsManager, "getRequestIds").mockReturnValue([request.id]);

            const mockActorManagerDeleteActor = vi.spyOn(actorsManager, "deleteActor");

            await processor.start(msBetweenChecks);

            expect(mockActorManagerDeleteActor).toHaveBeenCalledWith(request.id);
        });
    });
});
