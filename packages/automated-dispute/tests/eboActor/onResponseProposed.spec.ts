import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types";
import { ILogger } from "@ebo-agent/shared";
import { describe, expect, it, vi } from "vitest";

import { EboActor } from "../../src/eboActor";
import { EboMemoryRegistry } from "../../src/eboMemoryRegistry";
import { InvalidActorState } from "../../src/exceptions/invalidActorState.exception";
import { ProtocolProvider } from "../../src/protocolProvider";
import { EboEvent } from "../../src/types/events";
import { DEFAULT_MOCKED_PROPHET_REQUEST, DEFAULT_MOCKED_PROTOCOL_CONTRACTS } from "./fixtures";

const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

describe("onResponseProposed", () => {
    const requestId = "0x01";
    const indexedChainId: Caip2ChainId = "eip155:137";

    const protocolEpoch = {
        currentEpoch: 1n,
        currentEpochBlockNumber: 1n,
        currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
    };

    const responseProposedEvent: EboEvent<"ResponseProposed"> = {
        name: "ResponseProposed",
        blockNumber: 1n,
        logIndex: 2,
        metadata: {
            requestId: requestId,
            responseId: "0x02",
            response: {
                proposer: "0x03",
                requestId: requestId,
                response: {
                    block: protocolEpoch.currentEpochBlockNumber,
                    chainId: indexedChainId,
                    epoch: protocolEpoch.currentEpoch,
                },
            },
        },
    };

    const proposeData = responseProposedEvent.metadata.response.response;

    it("adds the response to the registry", async () => {
        const { actor, registry } = mockEboActor({
            requestId,
            indexedChainId,
            mockActorResponse: {
                mockBlockNumber: proposeData.block,
                mockEpoch: proposeData.epoch,
            },
        });

        const addResponseMock = vi.spyOn(registry, "addResponse");

        await actor.onResponseProposed(responseProposedEvent);

        expect(addResponseMock).toHaveBeenCalled();
    });

    it("throws if the response's request is not handled by actor", () => {
        const { actor, registry } = mockEboActor({
            requestId,
            indexedChainId,
            mockActorResponse: {
                mockBlockNumber: proposeData.block,
                mockEpoch: proposeData.epoch,
            },
        });

        vi.spyOn(registry, "getRequest").mockReturnValue(undefined);

        expect(actor.onResponseProposed(responseProposedEvent)).rejects.toBeInstanceOf(
            InvalidActorState,
        );
    });

    it("does not dispute the response if seems valid", async () => {
        const { actor, protocolProvider } = mockEboActor({
            requestId,
            indexedChainId,
            mockActorResponse: {
                mockBlockNumber: proposeData.block,
                mockEpoch: proposeData.epoch,
            },
        });

        const mockDisputeResponse = vi.spyOn(protocolProvider, "disputeResponse");

        await actor.onResponseProposed(responseProposedEvent);

        expect(mockDisputeResponse).not.toHaveBeenCalled();
    });

    it("dispute the response if it should be different", async () => {
        const { actor, protocolProvider } = mockEboActor({
            requestId,
            indexedChainId,
            mockActorResponse: {
                mockBlockNumber: proposeData.block + 1n,
                mockEpoch: proposeData.epoch,
            },
        });

        const mockDisputeResponse = vi.spyOn(protocolProvider, "disputeResponse");

        await actor.onResponseProposed(responseProposedEvent);

        expect(mockDisputeResponse).toHaveBeenCalled();
    });
});

// Mocks the basic dependencies behavior of EboActor instance on onResponseProposed
// to validate the proposal without disputing it
function mockEboActor(mockedValues: {
    requestId: string;
    indexedChainId: Caip2ChainId;
    mockActorResponse: {
        mockBlockNumber: bigint;
        mockEpoch: bigint;
    };
}) {
    const { requestId, indexedChainId, mockActorResponse } = mockedValues;
    const { mockBlockNumber, mockEpoch } = mockActorResponse;

    const protocolProvider = new ProtocolProvider(
        ["http://localhost:8538"],
        DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
    );

    const chainRpcUrls = new Map<Caip2ChainId, string[]>();
    chainRpcUrls.set(indexedChainId, ["http://localhost:8539"]);

    const blockNumberService = new BlockNumberService(chainRpcUrls, logger);
    const registry = new EboMemoryRegistry();

    const actor = new EboActor(protocolProvider, blockNumberService, registry, requestId, logger);

    vi.spyOn(registry, "getRequest").mockReturnValue(DEFAULT_MOCKED_PROPHET_REQUEST);

    vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue({
        currentEpochBlockNumber: 0n,
        currentEpoch: mockEpoch,
        currentEpochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
    });

    vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(mockBlockNumber);

    return {
        actor,
        protocolProvider,
        blockNumberService,
        registry,
        logger,
    };
}
