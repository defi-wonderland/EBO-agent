import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { ILogger } from "@ebo-agent/shared";
import { Address } from "viem";
import { describe, expect, it, vi } from "vitest";

import { EboEvent, Response } from "../../src/types/index.js";
import mocks from "../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.js";

const logger: ILogger = mocks.mockLogger();

describe("EboActor", () => {
    describe("processEvents", () => {
        describe("when RequestCreated is enqueued", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

            const requestId: Address = request.id;
            const indexedChainId: Caip2ChainId = request.chainId;

            const protocolEpoch = {
                currentEpoch: request.epoch,
                currentEpochBlockNumber: 1n,
                currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
            };

            const requestCreatedEvent: EboEvent<"RequestCreated"> = {
                blockNumber: 34n,
                requestId: requestId,
                logIndex: 1,
                name: "RequestCreated",
                metadata: {
                    chainId: indexedChainId,
                    epoch: protocolEpoch.currentEpoch,
                    requestId: requestId,
                    request: request.prophetData,
                },
            };

            it("stores the new request", async () => {
                const { actor, blockNumberService, protocolProvider, registry } =
                    mocks.buildEboActor(request, logger);

                const indexedEpochBlockNumber = 48n;

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    indexedEpochBlockNumber,
                );

                vi.spyOn(protocolProvider, "proposeResponse").mockImplementation(() =>
                    Promise.resolve(),
                );

                const mockRegistryAddRequest = vi
                    .spyOn(registry, "addRequest")
                    .mockImplementation(() => {});

                actor.enqueue(requestCreatedEvent);

                await actor.processEvents();

                expect(mockRegistryAddRequest).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: requestId,
                    }),
                );
            });

            it("proposes a response", async () => {
                const { actor, blockNumberService, protocolProvider } = mocks.buildEboActor(
                    request,
                    logger,
                );

                const indexedEpochBlockNumber = 48n;

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    indexedEpochBlockNumber,
                );

                vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(protocolEpoch);

                const proposeResponseMock = vi.spyOn(protocolProvider, "proposeResponse");

                actor.enqueue(requestCreatedEvent);

                await actor.processEvents();

                expect(proposeResponseMock).toHaveBeenCalledWith(
                    expect.objectContaining(request.prophetData),
                    expect.objectContaining({
                        proposer: expect.any(String),
                        requestId: requestCreatedEvent.metadata.requestId,
                        response: {
                            block: indexedEpochBlockNumber,
                            chainId: requestCreatedEvent.metadata.chainId,
                            epoch: protocolEpoch.currentEpoch,
                        },
                    }),
                );
            });

            it("does not propose when already proposed the same block", async () => {
                const { actor, protocolProvider, blockNumberService, registry } =
                    mocks.buildEboActor(request, logger);

                const indexedEpochBlockNumber = 48n;

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    indexedEpochBlockNumber,
                );

                const proposeResponseMock = vi.spyOn(protocolProvider, "proposeResponse");

                const previousResponses = new Map<string, Response>();
                previousResponses.set("0x01", {
                    id: "0x01",
                    createdAt: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
                    prophetData: {
                        proposer: "0x02",
                        requestId: requestId,
                        response: {
                            block: indexedEpochBlockNumber,
                            chainId: requestCreatedEvent.metadata.chainId,
                            epoch: protocolEpoch.currentEpoch,
                        },
                    },
                });

                vi.spyOn(registry, "getResponses").mockReturnValue(
                    Object.values(previousResponses),
                );

                actor.enqueue(requestCreatedEvent);

                await actor.processEvents();

                expect(proposeResponseMock).not.toHaveBeenCalled();
            });

            it.todo("throws if the indexed chain block number cannot be fetched");
        });
    });
});
