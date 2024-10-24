import { Branded, Caip2ChainId, NormalizedHex, UnixTimestamp } from "@ebo-agent/shared";
import { Address, Hex } from "viem";

export type RequestId = Branded<NormalizedHex, "RequestId">;
export type ResponseId = Branded<NormalizedHex, "ResponseId">;
export type DisputeId = Branded<NormalizedHex, "DisputeId">;

export type RequestStatus = "Active" | "Finalized";

export interface Request {
    id: RequestId;
    status: RequestStatus;

    createdAt: {
        /** Timestamp of the block the request was created on */
        timestamp: UnixTimestamp;
        blockNumber: bigint;
        logIndex: number;
    };

    decodedData: {
        requestModuleData: {
            epoch: bigint;
            chainId: Caip2ChainId;
            accountingExtension: Address;
            paymentAmount: bigint;
        };
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
