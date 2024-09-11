import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { Timestamp } from "@ebo-agent/shared";
import { Address } from "viem";

import type { EboEvent, EboEventName } from "../types/events.js";
import type { Dispute, Request, Response } from "../types/prophet.js";
import { ProtocolContractsNames } from "../constants.js";

export type ProtocolContract = (typeof ProtocolContractsNames)[number];
export type ProtocolContractsAddresses = Record<ProtocolContract, Address>;

/**
 * IReadProvider defines the read operations that can be performed on the protocol.
 */
export interface IReadProvider {
    /**
     * Gets the current epoch, along with the block number and its timestamp.
     *
     * @returns A promise that resolves with the current epoch, block number, and timestamp.
     */
    getCurrentEpoch(): Promise<{
        currentEpoch: bigint;
        currentEpochBlockNumber: bigint;
        currentEpochTimestamp: Timestamp;
    }>;

    /**
     * Gets the last finalized block number.
     *
     * @returns A promise that resolves with the block number of the last finalized block.
     */
    getLastFinalizedBlock(): Promise<bigint>;

    /**
     * Retrieves events from the protocol within a specified block range.
     *
     * @param _fromBlock The starting block number.
     * @param _toBlock The ending block number.
     * @returns A promise that resolves with an array of protocol events.
     */
    getEvents(_fromBlock: bigint, _toBlock: bigint): Promise<EboEvent<EboEventName>[]>;

    /**
     * Checks whether the specified address has staked assets.
     *
     * @param _address The address to check.
     * @returns A promise that resolves with a boolean indicating whether the address has staked assets.
     */
    hasStakedAssets(_address: Address): Promise<boolean>;

    /**
     * Gets the list of available chains that the protocol supports.
     *
     * @returns A promise that resolves with an array of chain IDs.
     */
    getAvailableChains(): Promise<string[]>;
}

/**
 * IWriteProvider defines the write operations that can be performed on the protocol.
 */
export interface IWriteProvider {
    /**
     * Creates a request on the EBO Request Creator contract.
     *
     * @param epoch The epoch for which the request is being created.
     * @param chains An array of chain identifiers where the request should be created.
     * @throws Will throw an error if the chains array is empty or if the transaction fails.
     * @returns A promise that resolves when the request is successfully created.
     */
    createRequest(epoch: bigint, chains: string[]): Promise<void>;

    /**
     * Proposes a response to a request.
     *
     * @param _requestId The ID of the request.
     * @param _epoch The epoch of the request.
     * @param _chainId The chain ID where the request was made.
     * @param _blockNumber The block number associated with the response.
     * @returns A promise that resolves when the response is proposed.
     */
    proposeResponse(
        _requestId: string,
        _epoch: bigint,
        _chainId: Caip2ChainId,
        _blockNumber: bigint,
    ): Promise<void>;

    /**
     * Disputes a proposed response.
     *
     * @param _requestId The ID of the request.
     * @param _responseId The ID of the response to dispute.
     * @param _proposer The address of the proposer.
     * @returns A promise that resolves when the response is disputed.
     */
    disputeResponse(_requestId: string, _responseId: string, _proposer: Address): Promise<void>;

    /**
     * Pledges support for a dispute.
     *
     * @param _request The request data for the dispute.
     * @param _dispute The dispute data.
     * @returns A promise that resolves when the pledge is made.
     */
    pledgeForDispute(
        _request: Request["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void>;

    /**
     * Pledges against a dispute.
     *
     * @param _request The request data for the dispute.
     * @param _dispute The dispute data.
     * @returns A promise that resolves when the pledge is made.
     */
    pledgeAgainstDispute(
        _request: Request["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void>;

    /**
     * Settles a dispute by finalizing the response.
     *
     * @param _request The request data.
     * @param _response The response data.
     * @param _dispute The dispute data.
     * @returns A promise that resolves when the dispute is settled.
     */
    settleDispute(
        _request: Request["prophetData"],
        _response: Response["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void>;

    /**
     * Escalates a dispute to a higher authority or layer.
     *
     * @param _request The request data.
     * @param _response The response data.
     * @param _dispute The dispute data.
     * @returns A promise that resolves when the dispute is escalated.
     */
    escalateDispute(
        _request: Request["prophetData"],
        _response: Response["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void>;

    /**
     * Finalizes a request after the response and dispute resolution are complete.
     *
     * @param _request The request data.
     * @param _response The response data.
     * @returns A promise that resolves when the request is finalized.
     */
    finalize(_request: Request["prophetData"], _response: Response["prophetData"]): Promise<void>;
}

/**
 * IProtocolProvider defines the interface for a protocol provider that includes both read and write operations.
 */
export interface IProtocolProvider {
    /**
     * The write operations available on the protocol.
     */
    write: IWriteProvider;

    /**
     * The read operations available on the protocol.
     */
    read: IReadProvider;
}