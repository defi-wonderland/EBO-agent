import { Caip2ChainId, ILogger, UnixTimestamp } from "@ebo-agent/shared";
import { keccak256, toHex } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResponseAlreadyProposed } from "../../../src/exceptions/index.js";
import { ProtocolProvider } from "../../../src/providers/index.js";
import {
    EboEvent,
    Epoch,
    RequestId,
    Response,
    ResponseBody,
    ResponseId,
} from "../../../src/types/index.js";
import mocks from "../../mocks/index.js";
import { DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures.js";

const logger: ILogger = mocks.mockLogger();

describe("EboActor", () => {
    describe("processEvents", () => {
        describe("when RequestCreated is enqueued", () => {
            const request = DEFAULT_MOCKED_REQUEST_CREATED_DATA;

            const requestId: RequestId = request.id;
            const indexedChainId: Caip2ChainId = request.chainId;

            const protocolEpoch: Epoch = {
                number: request.epoch,
                firstBlockNumber: 1n,
                startTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) as UnixTimestamp,
            };

            const requestCreatedEvent: EboEvent<"RequestCreated"> = {
                blockNumber: 34n,
                requestId: requestId,
                logIndex: 1,
                name: "RequestCreated",
                metadata: {
                    chainId: keccak256(toHex(indexedChainId)),
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
                const { actor, protocolProvider, blockNumberService, registry } =
                    mocks.buildEboActor(request, logger);

                vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(protocolEpoch);

                const proposerAddress = "0x1234567890123456789012345678901234567890";
                vi.spyOn(protocolProvider, "getAccountAddress").mockReturnValue(proposerAddress);

                const indexedEpochBlockNumber = 48n;
                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    indexedEpochBlockNumber,
                );

                const proposeResponseMock = vi
                    .spyOn(protocolProvider, "proposeResponse")
                    .mockResolvedValue();

                actor.enqueue(requestCreatedEvent);

                await actor.processEvents();

                const storedRequest = registry.getRequest(request.id);
                expect(storedRequest).toBeDefined();

                expect(proposeResponseMock).toHaveBeenCalledWith(
                    expect.objectContaining(request.prophetData),
                    expect.objectContaining({
                        proposer: proposerAddress,
                        requestId: requestCreatedEvent.metadata.requestId,
                        response: ProtocolProvider.encodeResponse({
                            block: indexedEpochBlockNumber,
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
                        id: "0x01" as ResponseId,
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

                await expect(actor.processEvents()).rejects.toThrow(ResponseAlreadyProposed);

                expect(proposeResponseMock).not.toHaveBeenCalled();
            });

            it.todo("throws if the indexed chain block number cannot be fetched");
        });
    });
});
