import { Branded, Caip2ChainId, NormalizedAddress, UnixTimestamp } from "@ebo-agent/shared";
import { Address, Hex } from "viem";

export type RequestId = Branded<NormalizedAddress, "RequestId">;
export type ResponseId = Branded<NormalizedAddress, "ResponseId">;
export type DisputeId = Branded<NormalizedAddress, "DisputeId">;

export type RequestStatus = "Active" | "Finalized";

export interface Request {
    id: RequestId;
    chainId: Caip2ChainId;
    epoch: bigint;
    createdAt: {
        /** Timestamp of the block the request was created on */
        timestamp: UnixTimestamp;
        blockNumber: bigint;
        logIndex: number;
    };
    status: RequestStatus;

    decodedData: {
        responseModuleData: {
            accountingExtension: Address;
            bondToken: Address;
            bondSize: bigint;
            deadline: bigint;
            disputeWindow: bigint;
        };
        disputeModuleData: {
            accountingExtension: Address;
            bondToken: Address;
            bondSize: bigint;
            maxNumberOfEscalations: bigint;
            bondEscalationDeadline: bigint;
            tyingBuffer: bigint;
            disputeWindow: bigint;
        };
    };

    prophetData: Readonly<{
        nonce: bigint;
        requester: Address;

        requestModule: Address;
        responseModule: Address;
        disputeModule: Address;
        resolutionModule: Address;
        finalityModule: Address;

        requestModuleData: Hex;
        responseModuleData: Hex;
        disputeModuleData: Hex;
        resolutionModuleData: Hex;
        finalityModuleData: Hex;
    }>;
}

export type ResponseBody = {
    block: bigint;
};

export interface Response {
    id: ResponseId;
    createdAt: {
        /** Timestamp of the block the response was created on */
        timestamp: UnixTimestamp;
        blockNumber: bigint;
        logIndex: number;
    };

    decodedData: {
        response: ResponseBody;
    };

    prophetData: Readonly<{
        proposer: Address;
        requestId: RequestId;
        response: Hex;
    }>;
}

export type DisputeStatus = "None" | "Active" | "Escalated" | "Won" | "Lost" | "NoResolution";

export interface Dispute {
    id: DisputeId;
    createdAt: {
        /** Timestamp of the block the dispute was created on */
        timestamp: UnixTimestamp;
        blockNumber: bigint;
        logIndex: number;
    };
    status: DisputeStatus;

    prophetData: {
        disputer: Address;
        proposer: Address;
        responseId: ResponseId;
        requestId: RequestId;
    };
}

export type AccountingModules = {
    requestModule: Address;
    responseModule: Address;
    escalationModule: Address;
};
