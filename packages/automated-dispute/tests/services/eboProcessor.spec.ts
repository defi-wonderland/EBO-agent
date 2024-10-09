import { BlockNumberService, Caip2ChainId } from "@ebo-agent/blocknumber";
import { Timestamp } from "@ebo-agent/shared";
import { Block } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PendingModulesApproval, ProcessorAlreadyStarted } from "../../src/exceptions/index.js";
import { ProtocolProvider } from "../../src/providers/index.js";
import {
    AccountingModules,
    EboEvent,
    EboEventName,
    Epoch,
    RequestId,
} from "../../src/types/index.js";
import mocks from "../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../services/eboActor/fixtures.js";

const logger = mocks.mockLogger();
const msBetweenChecks = 1;
const accountingModules: AccountingModules = {
    requestModule: "0x01",
    responseModule: "0x02",
    escalationModule: "0x03",
};

const allModulesApproved = Object.values(accountingModules);

describe("EboProcessor", () => {
    describe("start", () => {
        const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("throws if at least one module is pending approval", async () => {
            const { processor, protocolProvider } = mocks.buildEboProcessor(
                logger,
                accountingModules,
            );

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue([]);

            const result = processor.start();

            expect(result).rejects.toThrow(PendingModulesApproval);
        });

        it("bootstraps actors with onchain active requests when starting", async () => {
            const { processor, actorsManager, protocolProvider } = mocks.buildEboProcessor(
                logger,
                accountingModules,
            );

            const currentEpoch: Epoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const lastFinalizedBlock = {
                number: currentEpoch.firstBlockNumber + 10n,
            } as unknown as Block<bigint, false, "finalized">;

            const requestCreatedEvent: EboEvent<"RequestCreated"> = {
                name: "RequestCreated",
                blockNumber: 1n,
                logIndex: 1,
                timestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
                requestId: request.id,
                metadata: {
                    requestId: request.id,
                    epoch: request.epoch,
                    chainId: request.chainId,
                    request: request.prophetData,
                },
            };

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(
                lastFinalizedBlock,
            );
            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue([requestCreatedEvent]);

            const { actor } = mocks.buildEboActor(request, logger);
            const mockCreateActor = vi.spyOn(actorsManager, "createActor").mockReturnValue(actor);

            await processor.start(msBetweenChecks);

            const expectedActorRequest = expect.objectContaining({
                id: requestCreatedEvent.requestId,
                epoch: currentEpoch.number,
                chainId: request.chainId,
            });

            expect(mockCreateActor).toHaveBeenCalledWith(
                expectedActorRequest,
                expect.any(ProtocolProvider),
                expect.any(BlockNumberService),
                logger,
            );
        });

        it("does not create actors to handle unsupported chains", async () => {
            const { processor, actorsManager, protocolProvider } = mocks.buildEboProcessor(logger);

            const currentEpoch: Epoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const request = {
                ...DEFAULT_MOCKED_REQUEST_CREATED_DATA,
                chainId: "eip155:61" as const, // ETC
            };

            const requestCreatedEvent: EboEvent<"RequestCreated"> = {
                name: "RequestCreated",
                blockNumber: 1n,
                logIndex: 1,
                timestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
                requestId: request.id,
                metadata: {
                    requestId: request.id,
                    epoch: request.epoch,
                    chainId: request.chainId,
                    request: request.prophetData,
                },
            };

            const lastFinalizedBlock = {
                number: (currentEpoch.firstBlockNumber + 10n) as Timestamp,
            } as unknown as Block<bigint, false, "finalized">;

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(
                lastFinalizedBlock,
            );
            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue([requestCreatedEvent]);

            const mockCreateActor = vi.spyOn(actorsManager, "createActor");

            await processor.start(msBetweenChecks);

            expect(mockCreateActor).not.toHaveBeenCalled();
        });

        it("throws if called more than once", async () => {
            const { processor, protocolProvider } = mocks.buildEboProcessor(logger);

            const currentEpoch: Epoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const lastFinalizedBlock = {
                number: (currentEpoch.firstBlockNumber + 10n) as Timestamp,
            } as unknown as Block<bigint, false, "finalized">;

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(
                lastFinalizedBlock,
            );
            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue([]);

            await processor.start(1);

            expect(processor.start(1)).rejects.toThrow(ProcessorAlreadyStarted);
        });

        it("fetches events since epoch start when starting", async () => {
            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(
                logger,
                accountingModules,
            );
            const { actor } = mocks.buildEboActor(request, logger);

            const currentEpoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const currentBlock = {
                number: currentEpoch.firstBlockNumber + 10n,
            } as unknown as Block<bigint, false, "finalized">;

            const requestCreatedEvent: EboEvent<"RequestCreated"> = {
                name: "RequestCreated",
                blockNumber: 1n,
                logIndex: 1,
                timestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
                requestId: request.id,
                metadata: {
                    requestId: request.id,
                    epoch: request.epoch,
                    chainId: request.chainId,
                    request: request.prophetData,
                },
            };

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(currentBlock);
            vi.spyOn(actorsManager, "createActor").mockReturnValue(actor);
            vi.spyOn(actor, "processEvents").mockImplementation(() => Promise.resolve());
            vi.spyOn(actor, "onLastBlockUpdated").mockImplementation(() => Promise.resolve());
            vi.spyOn(actor, "canBeTerminated").mockResolvedValue(false);

            const mockGetEvents = vi.spyOn(protocolProvider, "getEvents");
            mockGetEvents.mockResolvedValue([requestCreatedEvent]);

            await processor.start(msBetweenChecks);

            expect(mockGetEvents).toHaveBeenCalledWith(
                currentEpoch.firstBlockNumber,
                currentBlock.number,
            );
        });

        it("keeps the last block checked unaltered when something fails during sync", async () => {
            const initialCurrentBlock = 1n;

            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(
                logger,
                accountingModules,
            );
            const { actor } = mocks.buildEboActor(request, logger);

            const currentEpoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const mockProtocolProviderGetEvents = vi
                .spyOn(protocolProvider, "getEvents")
                .mockImplementationOnce(() => {
                    // Simulate failure during first synch
                    throw new Error();
                })
                .mockResolvedValueOnce([]);

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );

            vi.spyOn(protocolProvider, "getLastFinalizedBlock")
                .mockResolvedValueOnce({ number: initialCurrentBlock + 10n } as unknown as Block<
                    bigint,
                    false,
                    "finalized"
                >)
                .mockResolvedValueOnce({ number: initialCurrentBlock + 20n } as unknown as Block<
                    bigint,
                    false,
                    "finalized"
                >);

            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(actorsManager, "createActor").mockReturnValue(actor);
            vi.spyOn(actor, "processEvents").mockImplementation(() => Promise.resolve());
            vi.spyOn(actor, "onLastBlockUpdated").mockImplementation(() => Promise.resolve());
            vi.spyOn(actor, "canBeTerminated").mockResolvedValue(false);

            await processor.start(msBetweenChecks);

            expect(mockProtocolProviderGetEvents).toHaveBeenNthCalledWith(
                1,
                currentEpoch.firstBlockNumber,
                initialCurrentBlock + 10n,
            );

            expect(mockProtocolProviderGetEvents).toHaveBeenCalledTimes(1);
            expect(logger.error).toHaveBeenCalledWith(expect.stringMatching("Sync failed"));

            await vi.advanceTimersByTimeAsync(msBetweenChecks);

            expect(mockProtocolProviderGetEvents).toHaveBeenNthCalledWith(
                2,
                currentEpoch.firstBlockNumber,
                initialCurrentBlock + 20n,
            );
        });

        it("fetches non-consumed events if event fetching fails", async () => {
            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(
                logger,
                accountingModules,
            );
            const { actor } = mocks.buildEboActor(request, logger);

            const mockLastCheckedBlock = 5n;
            processor["lastCheckedBlock"] = mockLastCheckedBlock;

            const currentEpoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const currentBlock = {
                number: (currentEpoch.firstBlockNumber + 10n) as Timestamp,
            } as unknown as Block<bigint, false, "finalized">;

            const requestCreatedEvent: EboEvent<"RequestCreated"> = {
                name: "RequestCreated",
                blockNumber: 6n,
                timestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
                logIndex: 1,
                requestId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.id,
                metadata: {
                    requestId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.id,
                    epoch: DEFAULT_MOCKED_REQUEST_CREATED_DATA.epoch,
                    chainId: DEFAULT_MOCKED_REQUEST_CREATED_DATA.chainId,
                    request: DEFAULT_MOCKED_REQUEST_CREATED_DATA["prophetData"],
                },
            };

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(currentBlock);
            vi.spyOn(actorsManager, "createActor").mockReturnValue(actor);
            vi.spyOn(actor, "processEvents").mockImplementation(() => Promise.resolve());
            vi.spyOn(actor, "onLastBlockUpdated").mockImplementation(() => Promise.resolve());
            vi.spyOn(actor, "canBeTerminated").mockResolvedValue(false);

            const mockGetEvents = vi.spyOn(protocolProvider, "getEvents");
            mockGetEvents.mockResolvedValue([requestCreatedEvent]);

            processor["lastCheckedBlock"] = mockLastCheckedBlock;

            await processor.start(msBetweenChecks);

            expect(mockGetEvents).toHaveBeenCalledWith(mockLastCheckedBlock, currentBlock.number);
        });

        it("enqueues and process every new event into the actor", async () => {
            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(
                logger,
                accountingModules,
            );

            const currentEpoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const currentBlock = {
                number: currentEpoch.firstBlockNumber + 10n,
            } as unknown as Block<bigint, false, "finalized">;

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(currentBlock);

            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;
            const response = mocks.buildResponse(request);

            const eventStream: EboEvent<EboEventName>[] = [
                {
                    name: "RequestCreated",
                    blockNumber: 6n,
                    logIndex: 1,
                    timestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
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
                    timestamp: BigInt(Date.UTC(2024, 1, 2, 0, 0, 0, 0)) as Timestamp,
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

            vi.spyOn(actor, "onLastBlockUpdated").mockImplementation(() => Promise.resolve());

            vi.spyOn(actorsManager, "createActor").mockResolvedValue(actor);
            vi.spyOn(actorsManager, "getActor").mockReturnValue(actor);

            await processor.start(msBetweenChecks);

            expect(mockActorProcessEvents).toHaveBeenCalledOnce();
            expect(mockActorEnqueue).toHaveBeenCalledTimes(2);
        });

        it("enqueues events into corresponding actors", async () => {
            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(
                logger,
                accountingModules,
            );

            const currentEpoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const currentBlock = {
                number: currentEpoch.firstBlockNumber + 10n,
            } as unknown as Block<bigint, false, "finalized">;

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );
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
                    timestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
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
                    timestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
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

            vi.spyOn(actor1, "onLastBlockUpdated").mockImplementation(() => Promise.resolve());
            vi.spyOn(actor2, "onLastBlockUpdated").mockImplementation(() => Promise.resolve());

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

        it("creates a request when no actor is handling a chain's current epoch", async () => {
            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(
                logger,
                accountingModules,
            );

            const currentEpoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const lastFinalizedBlock = { number: 1n } as unknown as Block<
                bigint,
                false,
                "finalized"
            >;

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(
                lastFinalizedBlock,
            );
            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue([]);
            vi.spyOn(protocolProvider, "getAvailableChains").mockResolvedValue([
                "eip155:1",
                "eip155:42161",
            ]);

            vi.spyOn(actorsManager, "getActorsRequests").mockReturnValue([
                { id: "0x01" as RequestId, chainId: "eip155:1", epoch: currentEpoch.number },
            ]);

            const mockProtocolProviderCreateRequest = vi
                .spyOn(protocolProvider, "createRequest")
                .mockImplementation(() => Promise.resolve());

            await processor.start();

            expect(mockProtocolProviderCreateRequest).toHaveBeenCalledWith(
                currentEpoch.number,
                "eip155:42161",
            );
        });

        it("does not create a new request if a corresponding actor already exist", async () => {
            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(
                logger,
                accountingModules,
            );

            const currentEpoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const lastFinalizedBlock = {
                number: 1n,
            } as unknown as Block<bigint, false, "finalized">;

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(
                lastFinalizedBlock,
            );
            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue([]);
            vi.spyOn(protocolProvider, "getAvailableChains").mockResolvedValue([
                "eip155:1",
                "eip155:42161",
            ]);

            vi.spyOn(actorsManager, "getActorsRequests").mockReturnValue([
                { id: "0x01" as RequestId, chainId: "eip155:1", epoch: currentEpoch.number },
                { id: "0x02" as RequestId, chainId: "eip155:42161", epoch: currentEpoch.number },
            ]);

            const mockProtocolProviderCreateRequest = vi
                .spyOn(protocolProvider, "createRequest")
                .mockImplementation(() => Promise.resolve());

            await processor.start();

            expect(mockProtocolProviderCreateRequest).not.toHaveBeenCalled();
        });

        it("handles errors during request creation", async () => {
            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(
                logger,
                accountingModules,
            );

            const currentEpoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const lastFinalizedBlock = {
                number: 1n,
            } as unknown as Block<bigint, false, "finalized">;

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(
                lastFinalizedBlock,
            );
            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue([]);
            vi.spyOn(protocolProvider, "getAvailableChains").mockResolvedValue([
                "eip155:1",
                "eip155:42161",
            ]);
            vi.spyOn(protocolProvider, "createRequest").mockImplementation(() => Promise.reject());

            vi.spyOn(actorsManager, "getActorsRequests").mockReturnValue([
                { id: "0x01" as RequestId, chainId: "eip155:1", epoch: currentEpoch.number },
            ]);

            expect(processor.start()).resolves.not.toThrow();
        });

        it.skip("notifies if a request failed to be created");

        it("removes the actor from registry when terminating", async () => {
            const { processor, protocolProvider, actorsManager } = mocks.buildEboProcessor(
                logger,
                accountingModules,
            );

            const currentEpoch = {
                number: 1n,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as Timestamp,
            };

            const currentBlock = {
                number: currentEpoch.number + 10n,
            } as unknown as Block<bigint, false, "finalized">;

            vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue(
                allModulesApproved,
            );
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(currentEpoch);
            vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue(currentBlock);

            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

            vi.spyOn(protocolProvider, "getEvents").mockResolvedValue([]);

            const { actor } = mocks.buildEboActor(request, logger);

            vi.spyOn(actor, "onLastBlockUpdated").mockImplementation(() => Promise.resolve());
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
