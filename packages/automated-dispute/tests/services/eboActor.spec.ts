import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PastEventEnqueueError, RequestMismatch } from "../../src/exceptions/index.js";
import { EboEvent, RequestId } from "../../src/types/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "../eboActor/fixtures.js";
import mocks from "../mocks/index.js";

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
            actor["onNewEvent"] = vi.fn().mockImplementation(() => Promise.resolve());

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

            actor.enqueue(event);

            expect(queue.size()).toEqual(1);

            await actor.processEvents();

            expect(queue.size()).toEqual(0);
        });

        it("enqueues again an event if its processing throws", async () => {
            const { actor } = mocks.buildEboActor(request, logger);
            const queue = actor["eventsQueue"];

            const mockEventsQueuePush = vi.spyOn(queue, "push");

            actor["onNewEvent"] = vi.fn().mockImplementation(() => Promise.reject());

            actor.enqueue(event);

            await actor.processEvents();

            expect(mockEventsQueuePush).toHaveBeenNthCalledWith(1, event);
            expect(mockEventsQueuePush).toHaveBeenNthCalledWith(2, event);
        });

        it("enqueues again an event at the top if its processing throws", async () => {
            const { actor } = mocks.buildEboActor(request, logger);
            const queue = actor["eventsQueue"];

            const firstEvent = { ...event };
            const secondEvent = { ...firstEvent, blockNumber: firstEvent.blockNumber + 1n };

            actor["onNewEvent"] = vi.fn().mockImplementation(() => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject();
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
            await vi.advanceTimersByTime(10);

            expect(queue.size()).toEqual(2);
            expect(queue.peek()).toEqual(firstEvent);
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

            const onNewEventDelay20 = () => {
                callOrder.push(1);

                return new Promise((resolve) => {
                    setTimeout(() => {
                        callOrder.push(1);

                        resolve(null);
                    }, 20);
                });
            };

            const onNewEventDelay1 = () => {
                callOrder.push(2);

                return new Promise((resolve) => {
                    setTimeout(() => {
                        callOrder.push(2);

                        resolve(null);
                    }, 1);
                });
            };

            actor["onNewEvent"] = vi
                .fn()
                .mockImplementationOnce(onNewEventDelay20)
                .mockImplementationOnce(onNewEventDelay1);

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
});