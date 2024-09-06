import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { NormalizedAddress } from "@ebo-agent/shared";
import { Address } from "viem";

export type RequestId = NormalizedAddress;
export type RequestStatus = "active" | "finalized";

export interface Request {
    id: RequestId;
    chainId: Caip2ChainId;
    epoch: bigint;
    createdAt: bigint;
    status: RequestStatus;

    prophetData: Readonly<{
        requester: Address;
        requestModule: Address;
        responseModule: Address;
        disputeModule: Address;
        resolutionModule: Address;
        finalityModule: Address;
        // Modules' data
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
    }>;
}

export interface Response {
    id: string;
    createdAt: bigint;

    prophetData: Readonly<{
        proposer: Address;
        requestId: RequestId;

        // To be byte-encode when sending it to Prophet
        response: {
            chainId: Caip2ChainId; // TODO: Pending on-chain definition on CAIP-2 usage
            block: bigint;
            epoch: bigint;
        };
    }>;
}

export type ResponseBody = Response["prophetData"]["response"];

export type DisputeStatus = "None" | "Active" | "Escalated" | "Won" | "Lost" | "NoResolution";

export interface Dispute {
    id: string;
    createdAt: bigint;
    status: DisputeStatus;

    prophetData: {
        disputer: Address;
        proposer: Address;
        responseId: string;
        requestId: RequestId;
    };
}
