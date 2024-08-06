import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { Logger } from "@ebo-agent/shared";
import { Address } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EboActor } from "../src/eboActor.js";
import { RequestMismatch } from "../src/exceptions/requestMismatch.js";
import { ProtocolProvider } from "../src/protocolProvider.js";
import { EboEvent } from "../src/types/events.js";

const logger = Logger.getInstance();

const protocolContracts = {
    oracle: "0x123456" as Address,
    epochManager: "0x654321" as Address,
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
                chainId: "eip155:10",
                epoch: protocolEpoch.currentEpoch,
                requestId: requestId,
            },
        };

        let protocolProvider: ProtocolProvider;
        let blockNumberService: BlockNumberService;

        beforeEach(() => {
            protocolProvider = new ProtocolProvider(["http://localhost:8538"], protocolContracts);

            const chainRpcUrls = new Map<Caip2ChainId, string[]>();
            chainRpcUrls.set(indexedChainId, ["http://localhost:8539"]);

            blockNumberService = new BlockNumberService(chainRpcUrls, logger);
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

            const actor = new EboActor(protocolProvider, blockNumberService, requestId);

            await actor.onRequestCreated(requestCreatedEvent);

            expect(proposeResponseMock).toHaveBeenCalledWith(
                requestCreatedEvent.metadata.requestId,
                protocolEpoch.currentEpoch,
                requestCreatedEvent.metadata.chainId,
                indexedEpochBlockNumber,
            );
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
                },
            };

            const actor = new EboActor(protocolProvider, blockNumberService, requestId);

            expect(actor.onRequestCreated(noMatchRequestCreatedEvent)).rejects.toBeInstanceOf(
                RequestMismatch,
            );
        });

        it("throws if current epoch cannot be fetched", () => {
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockRejectedValue(new Error());

            const actor = new EboActor(protocolProvider, blockNumberService, requestId);

            expect(actor.onRequestCreated(requestCreatedEvent)).rejects.toBeDefined();
        });

        it("throws if the indexed chain block number cannot be fetched", () => {
            vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue(protocolEpoch);
            vi.spyOn(blockNumberService, "getEpochBlockNumber").mockRejectedValue(new Error());

            const actor = new EboActor(protocolProvider, blockNumberService, requestId);

            expect(actor.onRequestCreated(requestCreatedEvent)).rejects.toBeDefined();
        });
    });

    describe.skip("onResponseProposed");
    describe.skip("onResponseDisputed");
    describe.skip("onFinalizeRequest");
    describe.skip("onDisputeStatusChanged");
    describe.skip("onDisputeEscalated");
});
