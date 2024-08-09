import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types";
import { ILogger } from "@ebo-agent/shared";
import { Address, ContractFunctionRevertedError } from "viem";
import { describe, expect, it, vi } from "vitest";

import { EboActor } from "../../src/eboActor";
import { EboMemoryRegistry } from "../../src/eboMemoryRegistry";
import { InvalidActorState } from "../../src/exceptions/invalidActorState.exception";
import { ProtocolProvider } from "../../src/protocolProvider";
import { EboEvent } from "../../src/types/events";
import { Response } from "../../src/types/prophet";
import { DEFAULT_MOCKED_PROTOCOL_CONTRACTS, DEFAULT_MOCKED_REQUEST_CREATED_DATA } from "./fixtures";

const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

describe("onResponseDisputed", () => {
    const event: EboEvent<"ResponseDisputed"> = {
        name: "ResponseDisputed",
        blockNumber: 1n,
        logIndex: 1,
        metadata: {
            disputeId: "0x03",
            responseId: "0x02",
            dispute: {
                requestId: "0x01",
                responseId: "0x02",
                disputer: "0x11",
                proposer: "0x12",
            },
        },
    };

    it("pledges for dispute if proposal should be different", async () => {
        const mockEpochBlockNumber = 1n;

        const { actor, blockNumberService, protocolProvider } = scaffoldEboActor({
            requestId: "0x01",
            indexedChainId: "eip155:1",
            mockActorResponse: {
                mockBlockNumber: mockEpochBlockNumber,
                mockEpoch: 1n,
            },
        });

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            mockEpochBlockNumber + 1n,
        );

        const mockPledgeForDispute = vi.spyOn(protocolProvider, "pledgeForDispute");

        await actor.onResponseDisputed(event);

        expect(mockPledgeForDispute).toHaveBeenCalled();
    });

    it("pledges against dispute if proposal is ok", async () => {
        const mockEpochBlockNumber = 1n;

        const { actor, blockNumberService, protocolProvider } = scaffoldEboActor({
            requestId: "0x01",
            indexedChainId: "eip155:1",
            mockActorResponse: {
                mockBlockNumber: mockEpochBlockNumber,
                mockEpoch: 1n,
            },
        });

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(mockEpochBlockNumber);

        const mockPledgeForDispute = vi.spyOn(protocolProvider, "pledgeAgainstDispute");

        await actor.onResponseDisputed(event);

        expect(mockPledgeForDispute).toHaveBeenCalled();
    });

    it("adds dispute to registry", async () => {
        const { actor, registry } = scaffoldEboActor({
            requestId: "0x01",
            indexedChainId: "eip155:1",
            mockActorResponse: {
                mockBlockNumber: 1n,
                mockEpoch: 1n,
            },
        });

        const addResponseMock = vi.spyOn(registry, "addDispute");

        await actor.onResponseDisputed(event);

        expect(addResponseMock).toHaveBeenCalled();
    });

    it("resolves if the pledge is reverted", async () => {
        const mockEpochBlockNumber = 1n;

        const { actor, blockNumberService, protocolProvider } = scaffoldEboActor({
            requestId: "0x01",
            indexedChainId: "eip155:1",
            mockActorResponse: {
                mockBlockNumber: mockEpochBlockNumber,
                mockEpoch: 1n,
            },
        });

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            mockEpochBlockNumber + 1n,
        );

        vi.spyOn(protocolProvider, "pledgeForDispute").mockRejectedValue(
            Object.create(ContractFunctionRevertedError.prototype),
        );

        expect(actor.onResponseDisputed(event)).resolves.toBeUndefined();
    });

    it("throws if protocol provider cannot complete pledge", () => {
        const mockEpochBlockNumber = 1n;

        const { actor, blockNumberService, protocolProvider } = scaffoldEboActor({
            requestId: "0x01",
            indexedChainId: "eip155:1",
            mockActorResponse: {
                mockBlockNumber: mockEpochBlockNumber,
                mockEpoch: 1n,
            },
        });

        vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(
            mockEpochBlockNumber + 1n,
        );

        vi.spyOn(protocolProvider, "pledgeForDispute").mockRejectedValue(new Error());

        expect(actor.onResponseDisputed(event)).rejects.toThrow();
    });

    it("throws if the response's request is not handled by actor", () => {
        const { actor } = scaffoldEboActor({
            requestId: "0x01",
            indexedChainId: "eip155:1",
            mockActorResponse: {
                mockBlockNumber: 1n,
                mockEpoch: 1n,
            },
        });

        const otherRequestEvent = {
            ...event,
            metadata: {
                ...event.metadata,
                dispute: {
                    ...event.metadata.dispute,
                    requestId: "0x02",
                },
            },
        };

        expect(actor.onResponseDisputed(otherRequestEvent)).rejects.toThrow(InvalidActorState);
    });
});

function scaffoldEboActor(mockedValues: {
    requestId: Address;
    indexedChainId: Caip2ChainId;
    mockActorResponse: { mockBlockNumber: bigint; mockEpoch: bigint };
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
    vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(mockBlockNumber);

    const registry = new EboMemoryRegistry();
    const response: Response = {
        id: "0x01",
        wasDisputed: false,
        prophetData: {
            proposer: "0x01",
            requestId: requestId,
            response: {
                chainId: indexedChainId,
                block: mockBlockNumber,
                epoch: mockEpoch,
            },
        },
    };

    vi.spyOn(registry, "getRequest").mockReturnValue(DEFAULT_MOCKED_REQUEST_CREATED_DATA);
    vi.spyOn(registry, "getResponse").mockReturnValue(response);

    const requestConfig = {
        id: requestId,
        epoch: mockEpoch,
        epochTimestamp: BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)),
    };

    const actor = new EboActor(
        requestConfig,
        protocolProvider,
        blockNumberService,
        registry,
        logger,
    );

    return {
        actor,
        protocolProvider,
        blockNumberService,
        registry,
    };
}
