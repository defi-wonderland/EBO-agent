import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { Address } from "viem";

export interface Request {
    requester: Address;
    requestModule: Address;
    responseModule: Address;
    disputeModule: Address;
    resolutionModule: Address;
    finalityModule: Address;
}

export interface Response {
    proposer: Address;
    requestId: string;

    prophetData: Readonly<{
        proposer: Address;
        requestId: string;

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
    status: DisputeStatus;

    prophetData: {
        disputer: Address;
        proposer: Address;
        responseId: string;
        requestId: string;
    };
}

export interface Dispute {
    disputer: Address;
    proposer: Address;
    responseId: string;
    requestId: string;
}
