import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { ILogger } from "@ebo-agent/shared";
import { Address } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EboMemoryRegistry } from "../../src/eboMemoryRegistry.js";
import { RequestMismatch } from "../../src/exceptions/index.js";
import { ProtocolProvider } from "../../src/protocolProvider.js";
import { EboActor } from "../../src/services/index.js";
import { EboEvent, Response } from "../../src/types/index.js";
import mocks from "../mocks/index.js";
import {
    DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
    DEFAULT_MOCKED_REQUEST_CREATED_DATA,
} from "./fixtures.js";

const logger: ILogger = mocks.mockLogger();

describe("EboActor", () => {
    describe("onRequestCreated", () => {
        const requestId: Address = "0x12345";
        const indexedChainId: Caip2ChainId = "eip155:137";

        const protocolEpoch = {
            currentEpoch: 1n,
            currentEpochBlockNumber: 1n,
            currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
        };

        const requestCreatedEvent: EboEvent<"RequestCreated"> = {
            blockNumber: 34n,
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

        beforeEach(() => {
            protocolProvider = new ProtocolProvider(
                ["http://localhost:8538"],
                DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
            );

            const chainRpcUrls = new Map<Caip2ChainId, string[]>();
            chainRpcUrls.set(indexedChainId, ["http://localhost:8539"]);

            blockNumberService = new BlockNumberService(chainRpcUrls, logger);
            registry = new EboMemoryRegistry();
        });

        it("proposes a response", async () => {
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
                logger,
            );

            await actor.onRequestCreated(requestCreatedEvent);

            expect(proposeResponseMock).toHaveBeenCalledWith(
                requestCreatedEvent.metadata.requestId,
                protocolEpoch.currentEpoch,
                requestCreatedEvent.metadata.chainId,
                indexedEpochBlockNumber,
            );
        });

        it("does not propose when already proposed the same block", async () => {
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
                logger,
            );

            vi.spyOn(registry, "getResponses").mockReturnValue([
                {
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
                },
            ]);

            await actor.onRequestCreated(requestCreatedEvent);

            expect(proposeResponseMock).not.toHaveBeenCalled();
        });

        it("throws if the event's request id does not match with actor's", () => {
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
                logger,
            );

            expect(actor.onRequestCreated(noMatchRequestCreatedEvent)).rejects.toThrowError(
                RequestMismatch,
            );
        });

        it("throws if the indexed chain block number cannot be fetched", () => {
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
                logger,
            );

            expect(actor.onRequestCreated(requestCreatedEvent)).rejects.toBeDefined();
        });
    });
});
