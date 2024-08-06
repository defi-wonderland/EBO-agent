import { Address } from "viem";

export interface Request {
    requester: Address;
    requestModule: Address;
    responseModule: Address;
    disputeModule: Address;
    resolutionModule: Address;
    finalityModule: Address;
    // We might need here modules' data too
}

export interface Response {
    proposer: Address;
    requestId: string;
    response: string;
}

export interface Dispute {
    disputer: Address;
    proposer: Address;
    responseId: string;
    requestId: string;
}
