import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { ILogger } from "@ebo-agent/shared";
import { Mutex } from "async-mutex";
import { Address } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EboActor } from "../../src/eboActor.js";
import { RequestMismatch } from "../../src/exceptions/index.js";
import { ProtocolProvider } from "../../src/protocolProvider.js";
import { EboMemoryRegistry } from "../../src/services/index.js";
import { EboEvent, Response } from "../../src/types/index.js";
import mocks from "../mocks/index.js";
import {
    DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
    DEFAULT_MOCKED_REQUEST_CREATED_DATA,
    mockedPrivateKey,
} from "./fixtures.js";

const logger: ILogger = mocks.mockLogger();

describe("EboActor", () => {
    describe("processEvents", () => {
        describe("when RequestCreated is enqueued", () => {
            const requestId: Address = "0x12345";
            const indexedChainId: Caip2ChainId = "eip155:137";

            const protocolEpoch = {
                currentEpoch: 1n,
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
                    request: DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData,
                },
            };

            let protocolProvider: ProtocolProvider;
            let blockNumberService: BlockNumberService;
            let registry: EboMemoryRegistry;
            let eventProcessingMutex: Mutex;

            beforeEach(() => {
                protocolProvider = new ProtocolProvider(
                    ["http://localhost:8538"],
                    DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
                    mockedPrivateKey,
                );

                const chainRpcUrls = new Map<Caip2ChainId, string[]>();
                chainRpcUrls.set(indexedChainId, ["http://localhost:8539"]);

                blockNumberService = new BlockNumberService(chainRpcUrls, logger);
                registry = new EboMemoryRegistry();
                eventProcessingMutex = new Mutex();
            });

            it("stores the new request", async () => {
                const indexedEpochBlockNumber = 48n;

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    indexedEpochBlockNumber,
                );

                vi.spyOn(protocolProvider, "proposeResponse").mockImplementation(() =>
                    Promise.resolve(),
                );

                const requestConfig = {
                    id: requestId,
                    epoch: protocolEpoch.currentEpoch,
                    epochTimestamp: protocolEpoch.currentEpochTimestamp,
                };

                const actor = new EboActor(
                    requestConfig,
                    protocolProvider,
                    blockNumberService,
                    registry,
                    eventProcessingMutex,
                    logger,
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

            it.skip("rollbacks state updates if the rpc call fails");

            it.skip("proposes a response", async () => {
                const indexedEpochBlockNumber = 48n;

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    indexedEpochBlockNumber,
                );

                const proposeResponseMock = vi.spyOn(protocolProvider, "proposeResponse");

                proposeResponseMock.mockImplementation(
                    (
                        _requestId: string,
                        _epoch: bigint,
                        _chainId: Caip2ChainId,
                        _blockNumbre: bigint,
                    ) => Promise.resolve(),
                );

                const requestConfig = {
                    id: requestId,
                    epoch: protocolEpoch.currentEpoch,
                    epochTimestamp: protocolEpoch.currentEpochTimestamp,
                };

                const actor = new EboActor(
                    requestConfig,
                    protocolProvider,
                    blockNumberService,
                    registry,
                    eventProcessingMutex,
                    logger,
                );

                actor.enqueue(requestCreatedEvent);

                await actor.processEvents();

                expect(proposeResponseMock).toHaveBeenCalledWith(
                    requestCreatedEvent.metadata.requestId,
                    protocolEpoch.currentEpoch,
                    requestCreatedEvent.metadata.chainId,
                    indexedEpochBlockNumber,
                );
            });

            it.skip("does not propose when already proposed the same block", async () => {
                const indexedEpochBlockNumber = 48n;

                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
                    indexedEpochBlockNumber,
                );

                const proposeResponseMock = vi.spyOn(protocolProvider, "proposeResponse");

                proposeResponseMock.mockImplementation(
                    (
                        _requestId: string,
                        _epoch: bigint,
                        _chainId: Caip2ChainId,
                        _blockNumbre: bigint,
                    ) => Promise.resolve(),
                );

                const requestConfig = {
                    id: requestId,
                    epoch: protocolEpoch.currentEpoch,
                    epochTimestamp: protocolEpoch.currentEpochTimestamp,
                };

                const actor = new EboActor(
                    requestConfig,
                    protocolProvider,
                    blockNumberService,
                    registry,
                    eventProcessingMutex,
                    logger,
                );

                const previousResponses = new Map<string, Response>();
                previousResponses.set("0x01", {
                    id: "0x01",
                    wasDisputed: false,
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

                vi.spyOn(registry, "getResponses").mockReturnValue(previousResponses);

                await actor.onRequestCreated(requestCreatedEvent);

                expect(proposeResponseMock).not.toHaveBeenCalled();
            });

            it.skip("throws if the event's request id does not match with actor's", () => {
                const noMatchRequestCreatedEvent: EboEvent<"RequestCreated"> = {
                    blockNumber: 34n,
                    logIndex: 1,
                    name: "RequestCreated",
                    metadata: {
                        chainId: "eip155:10",
                        epoch: protocolEpoch.currentEpoch,
                        requestId: "0x000000" as Address,
                        request: DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData,
                    },
                };

                const requestConfig = {
                    id: requestId,
                    epoch: protocolEpoch.currentEpoch,
                    epochTimestamp: protocolEpoch.currentEpochTimestamp,
                };

                const actor = new EboActor(
                    requestConfig,
                    protocolProvider,
                    blockNumberService,
                    registry,
                    eventProcessingMutex,
                    logger,
                );

                expect(actor.onRequestCreated(noMatchRequestCreatedEvent)).rejects.toThrowError(
                    RequestMismatch,
                );
            });

            it.skip("throws if the indexed chain block number cannot be fetched", () => {
                vi.spyOn(blockNumberService, "getEpochBlockNumber").mockRejectedValue(new Error());

                const requestConfig = {
                    id: requestId,
                    epoch: protocolEpoch.currentEpoch,
                    epochTimestamp: protocolEpoch.currentEpochTimestamp,
                };

                const actor = new EboActor(
                    requestConfig,
                    protocolProvider,
                    blockNumberService,
                    registry,
                    eventProcessingMutex,
                    logger,
                );

                expect(actor.onRequestCreated(requestCreatedEvent)).rejects.toBeDefined();
            });
        });
    });
});
