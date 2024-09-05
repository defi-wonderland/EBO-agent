import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { Timestamp } from "@ebo-agent/shared";
import { Address } from "viem";

import type { EboEvent, EboEventName } from "../types/events.js";
import type { Dispute, Request, Response } from "../types/prophet.js";
import { ProtocolContractsNames } from "../constants.js";

export type ProtocolContract = (typeof ProtocolContractsNames)[number];
export type ProtocolContractsAddresses = Record<ProtocolContract, Address>;

export interface IReadProvider {
    getCurrentEpoch(): Promise<{
        currentEpoch: bigint;
        currentEpochBlockNumber: bigint;
        currentEpochTimestamp: Timestamp;
    }>;
    getLastFinalizedBlock(): Promise<bigint>;
    getEvents(_fromBlock: bigint, _toBlock: bigint): Promise<EboEvent<EboEventName>[]>;
    hasStakedAssets(_address: Address): Promise<boolean>;
    getAvailableChains(): Promise<string[]>;
}

export interface IWriteProvider {
    createRequest(epoch: bigint, chains: string[]): Promise<void>;
    proposeResponse(
        _requestId: string,
        _epoch: bigint,
        _chainId: Caip2ChainId,
        _blockNumber: bigint,
    ): Promise<void>;
    disputeResponse(_requestId: string, _responseId: string, _proposer: Address): Promise<void>;
    pledgeForDispute(
        _request: Request["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void>;
    pledgeAgainstDispute(
        _request: Request["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void>;
    settleDispute(
        _request: Request["prophetData"],
        _response: Response["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void>;
    escalateDispute(
        _request: Request["prophetData"],
        _response: Response["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void>;
    finalize(_request: Request["prophetData"], _response: Response["prophetData"]): Promise<void>;
}

export interface IProtocolProvider {
    write: IWriteProvider;
    read: IReadProvider;
}
