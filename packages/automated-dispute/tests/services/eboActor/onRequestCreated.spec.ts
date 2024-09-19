import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { ILogger } from "@ebo-agent/shared";
import { Address } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProtocolProvider } from "../../../src/providers/index.js";
import { EboEvent, Epoch, Response, ResponseBody } from "../../../src/types/index.js";
import mocks from "../../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.js";

const logger: ILogger = mocks.mockLogger();

describe("EboActor", () => {
    describe("processEvents", () => {
        describe("when RequestCreated is enqueued", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

            const requestId: Address = request.id;
            const indexedChainId: Caip2ChainId = request.chainId;

            const protocolEpoch: Epoch = {
                number: request.epoch,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
            };

            const requestCreatedEvent: EboEvent<"RequestCreated"> = {
                blockNumber: 34n,
                requestId: requestId,
                logIndex: 1,
                name: "RequestCreated",
                metadata: {
                    chainId: indexedChainId,
                    epoch: protocolEpoch.number,
                    requestId: requestId,
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
                const proposerAddress = "0x1234567890123456789012345678901234567890";

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    indexedEpochBlockNumber,
                );

                vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(protocolEpoch);
                vi.spyOn(protocolProvider, "getAccountAddress").mockReturnValue(proposerAddress);

                const proposeResponseMock = vi.spyOn(protocolProvider, "proposeResponse");

                actor.enqueue(requestCreatedEvent);

                await actor.processEvents();

                expect(proposeResponseMock).toHaveBeenCalledWith(
                    expect.objectContaining(request.prophetData),
                    expect.objectContaining({
                        proposer: proposerAddress,
                        requestId: requestCreatedEvent.metadata.requestId,
                        response: ProtocolProvider.encodeResponse({
                            block: indexedEpochBlockNumber,
                            chainId: requestCreatedEvent.metadata.chainId,
                            epoch: protocolEpoch.number,
                        }),
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

                const responseBody: ResponseBody = {
                    block: indexedEpochBlockNumber,
                    chainId: requestCreatedEvent.metadata.chainId,
                    epoch: protocolEpoch.number,
                };
                const previousResponses: Response[] = [
                    {
                        id: "0x01",
                        createdAt: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
                        decodedData: {
                            response: responseBody,
                        },
                        prophetData: {
                            proposer: "0x02",
                            requestId: requestId,
                            response: ProtocolProvider.encodeResponse(responseBody),
                        },
                    },
                ];

                vi.spyOn(registry, "getResponses").mockReturnValue(previousResponses);

                actor.enqueue(requestCreatedEvent);

                await actor.processEvents();

                expect(proposeResponseMock).not.toHaveBeenCalled();
            });

            it.todo("throws if the indexed chain block number cannot be fetched");
        });
    });
});
