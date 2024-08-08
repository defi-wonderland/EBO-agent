import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { ILogger } from "@ebo-agent/shared";
import { Address } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EboActor } from "../../src/eboActor.js";
import { EboMemoryRegistry } from "../../src/eboMemoryRegistry.js";
import { RequestMismatch } from "../../src/exceptions/requestMismatch.js";
import { ProtocolProvider } from "../../src/protocolProvider.js";
import { EboEvent } from "../../src/types/events.js";
import { Response } from "../../src/types/prophet.js";
import { DEFAULT_MOCKED_PROPHET_REQUEST, DEFAULT_MOCKED_PROTOCOL_CONTRACTS } from "./fixtures.js";

const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

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
                request: DEFAULT_MOCKED_PROPHET_REQUEST,
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

            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(protocolEpoch);
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

            const actor = new EboActor(
                protocolProvider,
                blockNumberService,
                registry,
                requestId,
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

            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(protocolEpoch);
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

            const actor = new EboActor(
                protocolProvider,
                blockNumberService,
                registry,
                requestId,
                logger,
            );

            const previousResponses = new Map<string, Response>();
            previousResponses.set("0x01", {
                proposer: "0x02",
                requestId: requestId,
                response: {
                    block: indexedEpochBlockNumber,
                    chainId: requestCreatedEvent.metadata.chainId,
                    epoch: protocolEpoch.currentEpoch,
                },
            });

            vi.spyOn(registry, "getResponses").mockReturnValue(previousResponses);

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
                    request: DEFAULT_MOCKED_PROPHET_REQUEST,
                },
            };

            const actor = new EboActor(
                protocolProvider,
                blockNumberService,
                registry,
                requestId,
                logger,
            );

            expect(actor.onRequestCreated(noMatchRequestCreatedEvent)).rejects.toBeInstanceOf(
                RequestMismatch,
            );
        });

        it("throws if current epoch cannot be fetched", () => {
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockRejectedValue(new Error());

            const actor = new EboActor(
                protocolProvider,
                blockNumberService,
                registry,
                requestId,
                logger,
            );

            expect(actor.onRequestCreated(requestCreatedEvent)).rejects.toBeDefined();
        });

        it("throws if the indexed chain block number cannot be fetched", () => {
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(protocolEpoch);
            vi.spyOn(blockNumberService, "getEpochBlockNumber").mockRejectedValue(new Error());

            const actor = new EboActor(
                protocolProvider,
                blockNumberService,
                registry,
                requestId,
                logger,
            );

            expect(actor.onRequestCreated(requestCreatedEvent)).rejects.toBeDefined();
        });
    });

    describe.skip("onResponseDisputed");
    describe.skip("onFinalizeRequest");
    describe.skip("onDisputeStatusChanged");
    describe.skip("onDisputeEscalated");
});
