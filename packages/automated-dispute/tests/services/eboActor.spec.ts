import { Abi, ContractFunctionRevertedError, encodeErrorResult } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorHandler } from "../../src/exceptions/errorHandler.js";
import {
    CustomContractError,
    ErrorFactory,
    PastEventEnqueueError,
    RequestMismatch,
} from "../../src/exceptions/index.js";
import { ProtocolProvider } from "../../src/providers/index.js";
import { EboEvent, Request, RequestId } from "../../src/types/index.js";
import mocks from "../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../services/eboActor/fixtures.js";

const logger = mocks.mockLogger();

describe("EboActor", () => {
    const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

    const event: EboEvent<"RequestCreated"> = {
        name: "RequestCreated",
        blockNumber: 2n,
        logIndex: 1,
        requestId: request.id,
        metadata: {
            chainId: request.chainId,
            epoch: request.epoch,
            requestId: request.id,
            request: request.prophetData,
        },
    };

    beforeEach(() => {
        vi.spyOn(ProtocolProvider, "decodeRequestDisputeModuleData").mockReturnValue(
            request.decodedData.disputeModuleData,
        );

        vi.spyOn(ProtocolProvider, "decodeRequestResponseModuleData").mockReturnValue(
            request.decodedData.responseModuleData,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("enqueue", () => {
        it("enqueues an event", () => {
            const { actor } = mocks.buildEboActor(request, logger);

            const mockEventsQueuePush = vi.spyOn(actor["eventsQueue"], "push");

            actor.enqueue(event);

            expect(mockEventsQueuePush).toHaveBeenCalledWith(event);
        });

        it("throws when the event's request does not match with actor's request", () => {
            const { actor } = mocks.buildEboActor(request, logger);

            const otherRequestEvent = {
                ...event,
                requestId: (request.id === "0x01" ? "0x02" : "0x01") as RequestId,
            };

            expect(() => actor.enqueue(otherRequestEvent)).toThrow(RequestMismatch);
        });

        it("throws if an old event is enqueued after processing newer events", async () => {
            const processedEvent: EboEvent<"RequestCreated"> = { ...event };
            const oldEvent: EboEvent<"RequestCreated"> = {
                ...processedEvent,
                blockNumber: processedEvent.blockNumber - 1n,
            };

            const { actor } = mocks.buildEboActor(request, logger);

            // TODO: mock the procol provider instead
            actor["onLastEvent"] = vi.fn().mockImplementation(() => Promise.resolve());

            actor.enqueue(processedEvent);

            await actor.processEvents();

            expect(() => actor.enqueue(oldEvent)).toThrow(PastEventEnqueueError);
        });
    });

    describe("processEvents", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("consumes all events when processing", async () => {
            const { actor } = mocks.buildEboActor(request, logger);
            const queue = actor["eventsQueue"];

            actor["onLastEvent"] = vi.fn().mockImplementation(() => Promise.resolve());

            actor.enqueue(event);

            expect(queue.size()).toEqual(1);

            await actor.processEvents();

            expect(queue.size()).toEqual(0);
        });

        it("enqueues again an event if its processing throws", async () => {
            const { actor } = mocks.buildEboActor(request, logger);
            const queue = actor["eventsQueue"];

            const mockEventsQueuePush = vi.spyOn(queue, "push");

            actor["onLastEvent"] = vi
                .fn()
                .mockImplementation(() => Promise.reject(new Error("Test Error")));

            actor.enqueue(event);

            // Expect processEvents to throw and handle the rejection
            await expect(actor.processEvents()).rejects.toThrow("Test Error");

            // The event should not be re-enqueued because it was the only event in the queue
            expect(mockEventsQueuePush).toHaveBeenCalledTimes(1);
            expect(queue.size()).toBe(0);
        });

        it("enqueues again an event at the top if its processing throws", async () => {
            const { actor } = mocks.buildEboActor(request, logger);
            const queue = actor["eventsQueue"];

            const firstEvent = { ...event };
            const secondEvent = { ...firstEvent, blockNumber: firstEvent.blockNumber + 1n };

            const mockError = new CustomContractError("UnknownError", {
                shouldReenqueue: true,
                shouldTerminate: false,
                shouldNotify: false,
            });

            // Mock ErrorHandler.handle to prevent re-enqueueing
            const errorHandlerSpy = vi
                .spyOn(ErrorHandler, "handle")
                .mockImplementation(async () => {});

            actor["onLastEvent"] = vi.fn().mockImplementation(() => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(mockError);
                    }, 10);
                });
            });

            setTimeout(async () => {
                actor.enqueue(firstEvent);

                await actor.processEvents();
            }, 5);

            setTimeout(() => {
                actor.enqueue(secondEvent);
            }, 10);

            // First enqueue
            await vi.advanceTimersByTimeAsync(5);

            expect(queue.size()).toEqual(0);

            // Second enqueue
            await vi.advanceTimersByTimeAsync(5);

            expect(queue.size()).toEqual(1);
            expect(queue.peek()).toEqual(secondEvent);

            // processEvents throws and re-enqueues first event
            await vi.advanceTimersByTimeAsync(10);

            expect(queue.size()).toEqual(2);
            expect(queue.peek()).toEqual(firstEvent);

            errorHandlerSpy.mockRestore();
        });

        it("does not allow interleaved event processing", async () => {
            /**
             * This case aims to cover the scenario in which the first call keeps awaiting to
             * resolve its internal promises while a second call to `processEvents` with
             * a new batch of events is kicked off.
             *
             * We want the second call to wait for the first one to finish.
             *
             * To illustrate this case, without mutexes this would happen:
             *      | Interval 1      | Interval 2
             * t=5  | processEvents() |
             * t=10 |                 | processEvents()
             * t=11 |                 | resolve()
             * t=25 | resolve()       |
             *
             * With mutexes, we aim for this:
             *      | Interval 1      | Interval 2
             * t=5  | processEvents() |
             * t=25 | resolve()       | processEvents()
             * t=26 |                 | resolve()
             *
             */
            const callOrder: number[] = [];

            const response = mocks.buildResponse(request);

            const firstEvent: EboEvent<"RequestCreated"> = { ...event };
            const secondEvent: EboEvent<"ResponseProposed"> = {
                name: "ResponseProposed",
                blockNumber: firstEvent.blockNumber + 1n,
                logIndex: 1,
                requestId: firstEvent.requestId,
                metadata: {
                    requestId: firstEvent.requestId,
                    responseId: response.id,
                    response: response.prophetData,
                },
            };

            const { actor } = mocks.buildEboActor(request, logger);

            const onLastEventDelay20 = () => {
                callOrder.push(1);

                return new Promise((resolve) => {
                    setTimeout(() => {
                        callOrder.push(1);

                        resolve(null);
                    }, 20);
                });
            };

            const onLastEventDelay1 = () => {
                callOrder.push(2);

                return new Promise((resolve) => {
                    setTimeout(() => {
                        callOrder.push(2);

                        resolve(null);
                    }, 1);
                });
            };

            actor["onLastEvent"] = vi
                .fn()
                .mockImplementationOnce(onLastEventDelay20)
                .mockImplementationOnce(onLastEventDelay1);

            setTimeout(() => {
                actor.enqueue(firstEvent);

                actor.processEvents();
            }, 5);

            setTimeout(() => {
                actor.enqueue(secondEvent);

                actor.processEvents();
            }, 10);

            await vi.advanceTimersByTimeAsync(5);

            expect(callOrder).toEqual([1]);

            await vi.advanceTimersByTimeAsync(20);

            expect(callOrder).toEqual([1, 1, 2]);

            await vi.advanceTimersByTimeAsync(1);

            expect(callOrder).toEqual([1, 1, 2, 2]);
            expect(callOrder).not.toEqual([1, 2, 2, 1]); // Case with no mutexes
        });
    });

    describe("canBeTerminated", () => {
        it("returns false if the request has not been finalized yet", () => {
            const { actor, registry } = mocks.buildEboActor(request, logger);
            const currentBlockNumber = request.decodedData.responseModuleData.disputeWindow - 1n;

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponses").mockReturnValue([]);

            expect(actor.canBeTerminated(actor.actorRequest.epoch + 1n, currentBlockNumber)).toBe(
                false,
            );
        });

        it("returns false if there's one disputable response", () => {
            const response = mocks.buildResponse(request);
            const { actor, registry } = mocks.buildEboActor(request, logger);
            const currentBlockNumber =
                response.createdAt + request.decodedData.disputeModuleData.disputeWindow - 1n;

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponses").mockReturnValue([response]);
            vi.spyOn(registry, "getResponseDispute").mockReturnValue(undefined);

            expect(actor.canBeTerminated(actor.actorRequest.epoch + 1n, currentBlockNumber)).toBe(
                false,
            );
        });

        it("returns false if the request is finalized but there's one active dispute", () => {
            const request: Request = {
                ...DEFAULT_MOCKED_REQUEST_CREATED_DATA,
                status: "Finalized",
            };

            const response = mocks.buildResponse(request);
            const dispute = mocks.buildDispute(request, response, { status: "Active" });

            const { actor, registry } = mocks.buildEboActor(request, logger);
            const currentBlockNumber =
                response.createdAt + request.decodedData.disputeModuleData.disputeWindow - 1n;

            vi.spyOn(registry, "getRequest").mockReturnValue(request);
            vi.spyOn(registry, "getResponses").mockReturnValue([response]);
            vi.spyOn(registry, "getResponseDispute").mockReturnValue(dispute);

            const canBeTerminated = actor.canBeTerminated(
                actor.actorRequest.epoch + 1n,
                currentBlockNumber,
            );

            expect(canBeTerminated).toBe(false);
        });

        it("returns false if we are still in the same epoch", () => {
            const request: Request = {
                ...DEFAULT_MOCKED_REQUEST_CREATED_DATA,
                status: "Finalized",
            };

            const disputedResponse = mocks.buildResponse(request, { id: "0x01" });
            const undisputedResponse = mocks.buildResponse(request, {
                id: "0x02",
                createdAt: request.decodedData.responseModuleData.deadline - 1n,
            });

            const escalatedDispute = mocks.buildDispute(request, disputedResponse, {
                status: "Escalated",
            });

            const { actor, registry } = mocks.buildEboActor(request, logger);
            const currentBlockNumber =
                undisputedResponse.createdAt +
                request.decodedData.disputeModuleData.disputeWindow +
                1n;

            vi.spyOn(registry, "getRequest").mockReturnValue(request);

            vi.spyOn(registry, "getResponses").mockReturnValue([
                disputedResponse,
                undisputedResponse,
            ]);

            vi.spyOn(registry, "getResponseDispute").mockImplementation((response) => {
                switch (response.id) {
                    case disputedResponse.id:
                        return escalatedDispute;

                    case undisputedResponse.id:
                        return undefined;
                }
            });

            const canBeTerminatedDuringCurrentEpoch = actor.canBeTerminated(
                actor.actorRequest.epoch,
                currentBlockNumber,
            );

            const canBeTerminatedDuringNextEpoch = actor.canBeTerminated(
                actor.actorRequest.epoch + 1n,
                currentBlockNumber,
            );

            expect(canBeTerminatedDuringCurrentEpoch).toBe(false);
            // This is to validate that the change in the current epoch is the one that
            // changes the output
            expect(canBeTerminatedDuringNextEpoch).toBe(true);
        });

        it("returns true once everything is settled", () => {
            const request: Request = {
                ...DEFAULT_MOCKED_REQUEST_CREATED_DATA,
                status: "Finalized",
            };

            const disputedResponse = mocks.buildResponse(request, { id: "0x01" });
            const undisputedResponse = mocks.buildResponse(request, {
                id: "0x02",
                createdAt: request.decodedData.responseModuleData.deadline - 1n,
            });

            const escalatedDispute = mocks.buildDispute(request, disputedResponse, {
                status: "Escalated",
            });

            const { actor, registry } = mocks.buildEboActor(request, logger);
            const currentBlockNumber =
                undisputedResponse.createdAt +
                request.decodedData.disputeModuleData.disputeWindow +
                1n;

            vi.spyOn(registry, "getRequest").mockReturnValue(request);

            vi.spyOn(registry, "getResponses").mockReturnValue([
                disputedResponse,
                undisputedResponse,
            ]);

            vi.spyOn(registry, "getResponseDispute").mockImplementation((response) => {
                switch (response.id) {
                    case disputedResponse.id:
                        return escalatedDispute;

                    case undisputedResponse.id:
                        return undefined;
                }
            });

            const canBeTerminated = actor.canBeTerminated(
                actor.actorRequest.epoch + 1n,
                currentBlockNumber,
            );

            expect(canBeTerminated).toBe(true);
        });
    });

    describe("onRequestCreated", () => {
        it("throws a CustomContractError when proposeResponse fails with ContractFunctionRevertedError", async () => {
            const { actor } = mocks.buildEboActor(request, logger);
            const event: EboEvent<"RequestCreated"> = {
                name: "RequestCreated",
                blockNumber: 1n,
                logIndex: 0,
                requestId: request.id,
                metadata: {
                    chainId: request.chainId,
                    epoch: request.epoch,
                    requestId: request.id,
                    request: request.prophetData,
                },
            };

            vi.spyOn(actor["registry"], "getRequest").mockReturnValue(request);

            const abi: Abi = [
                {
                    type: "error",
                    name: "SomeError",
                    inputs: [{ name: "reason", type: "string" }],
                },
            ];

            const data = encodeErrorResult({
                abi,
                errorName: "SomeError",
                args: ["Test error message"],
            });

            const contractError = new ContractFunctionRevertedError({
                abi,
                data,
                functionName: "proposeResponse",
            });

            actor["proposeResponse"] = vi.fn().mockRejectedValue(contractError);

            const customError = new CustomContractError("SomeError", {
                shouldNotify: false,
                shouldReenqueue: true,
                shouldTerminate: false,
            });

            const errorFactorySpy = vi
                .spyOn(ErrorFactory, "createError")
                .mockReturnValue(customError);

            await expect(actor["onRequestCreated"](event)).rejects.toThrow(customError);

            expect(errorFactorySpy).toHaveBeenCalledWith(contractError.name);

            errorFactorySpy.mockRestore();
        });
    });

    describe("settleDispute", () => {
        it("escalates dispute when BondEscalationModule_ShouldBeEscalated error occurs", async () => {
            const { actor, protocolProvider } = mocks.buildEboActor(request, logger);
            const response = mocks.buildResponse(request);
            const dispute = mocks.buildDispute(request, response);

            const abi: Abi = [
                {
                    type: "error",
                    name: "BondEscalationModule_ShouldBeEscalated",
                    inputs: [],
                },
            ];

            const errorName = "BondEscalationModule_ShouldBeEscalated";
            const data = encodeErrorResult({
                abi,
                errorName,
                args: [],
            });

            const contractError = new ContractFunctionRevertedError({
                abi,
                data,
                functionName: "settleDispute",
            });

            vi.spyOn(protocolProvider, "settleDispute").mockRejectedValue(contractError);
            const escalateDisputeMock = vi
                .spyOn(protocolProvider, "escalateDispute")
                .mockResolvedValue();

            const customError = new CustomContractError(errorName, {
                shouldNotify: false,
                shouldReenqueue: false,
                shouldTerminate: false,
            });

            const onSpy = vi.spyOn(customError, "on").mockImplementation((eventName, handler) => {
                if (eventName === errorName) {
                    handler();
                }
                return customError;
            });

            vi.spyOn(ErrorFactory, "createError").mockReturnValue(customError);

            await actor["settleDispute"](request, response, dispute);

            expect(onSpy).toHaveBeenCalledWith(errorName, expect.any(Function));

            expect(escalateDisputeMock).toHaveBeenCalledWith(
                request.prophetData,
                response.prophetData,
                dispute.prophetData,
            );
            expect(logger.info).toHaveBeenCalledWith(`Dispute ${dispute.id} escalated.`);
        });

        it("rethrows error when settleDispute fails", async () => {
            const { actor, protocolProvider } = mocks.buildEboActor(request, logger);
            const response = mocks.buildResponse(request);
            const dispute = mocks.buildDispute(request, response);

            const settleError = new Error("SettleDispute failed");

            vi.spyOn(protocolProvider, "settleDispute").mockRejectedValue(settleError);

            await expect(actor["settleDispute"](request, response, dispute)).rejects.toThrow(
                settleError,
            );
        });
    });
});
