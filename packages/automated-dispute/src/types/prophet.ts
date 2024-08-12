import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { Timestamp } from "@ebo-agent/shared";
import { Address } from "viem";

export interface Request {
    id: string;
    chainId: Caip2ChainId;
    epoch: bigint;
    epochTimestamp: Timestamp;
    createdAt: bigint;

    prophetData: Readonly<{
        requester: Address;
        requestModule: Address;
        responseModule: Address;
        disputeModule: Address;
        resolutionModule: Address;
        finalityModule: Address;
    }>;
}

export interface Response {
    id: string;
    wasDisputed: boolean;

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

export interface Dispute {
    id: string;
    status: string;

    prophetData: {
        disputer: Address;
        proposer: Address;
        responseId: string;
        requestId: string;
    };
}
