import { Address } from "viem";

import type {
    Dispute,
    EboEvent,
    EboEventName,
    Epoch,
    Request,
    RequestId,
    Response,
} from "../types/index.js";
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
    getCurrentEpoch(): Promise<Epoch>;

    /**
     * Gets the last finalized block number.
     *
     * @returns A promise that resolves with the block number of the last finalized block.
     */
    getLastFinalizedBlock(): Promise<bigint>;

    /**
     * Retrieves events from the protocol within a specified block range.
     *
     * @param fromBlock The starting block number.
     * @param toBlock The ending block number.
     * @returns A promise that resolves with an array of protocol events.
     */
    getEvents(fromBlock: bigint, toBlock: bigint): Promise<EboEvent<EboEventName>[]>;

    /**
     * Gets the list of available chains that the protocol supports.
     *
     * @returns A promise that resolves with an array of chain IDs.
     */
    getAvailableChains(): Promise<string[]>;

    /**
     * Gets the address of the accounting module.
     *
     * @returns An address that points to the deployed accounting module.
     */
    getAccountingModuleAddress(): Address;

    /**
     * Gets the list of approved modules' addresses based on the wallet's account address.
     *
     * @returns A promise that resolves with an array of approved modules.
     */
    getAccountingApprovedModules(): Promise<Address[]>;
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
     * @param request The request data.
     * @param response The response data.
     * @returns A promise that resolves when the response is proposed.
     */
    proposeResponse(
        request: Request["prophetData"],
        response: Response["prophetData"],
    ): Promise<void>;

    /**
     * Disputes a proposed response.
     *
     * @param request The request  data.
     * @param response The response data.
     * @param dispute The dispute data.
     * @returns A promise that resolves when the response is disputed.
     */
    disputeResponse(
        request: Request["prophetData"],
        response: Response["prophetData"],
        dispute: Dispute["prophetData"],
    ): Promise<void>;
    /**
     * Pledges support for a dispute.
     *
     * @param request The request data for the dispute.
     * @param dispute The dispute data.
     * @returns A promise that resolves when the pledge is made.
     */
    pledgeForDispute(
        request: Request["prophetData"],
        dispute: Dispute["prophetData"],
    ): Promise<void>;

    /**
     * Pledges against a dispute.
     *
     * @param request The request data for the dispute.
     * @param dispute The dispute data.
     * @returns A promise that resolves when the pledge is made.
     */
    pledgeAgainstDispute(
        request: Request["prophetData"],
        dispute: Dispute["prophetData"],
    ): Promise<void>;

    /**
     * Settles a dispute by finalizing the response.
     *
     * @param request The request data.
     * @param response The response data.
     * @param dispute The dispute data.
     * @returns A promise that resolves when the dispute is settled.
     */
    settleDispute(
        request: Request["prophetData"],
        response: Response["prophetData"],
        dispute: Dispute["prophetData"],
    ): Promise<void>;

    /**
     * Escalates a dispute to a higher authority or layer.
     *
     * @param request The request data.
     * @param response The response data.
     * @param dispute The dispute data.
     * @returns A promise that resolves when the dispute is escalated.
     */
    escalateDispute(
        request: Request["prophetData"],
        response: Response["prophetData"],
        dispute: Dispute["prophetData"],
    ): Promise<void>;

    /**
     * Finalizes a request after the response and dispute resolution are complete.
     *
     * @param request The request data.
     * @param response The response data.
     * @returns A promise that resolves when the request is finalized.
     */
    finalize(request: Request["prophetData"], response: Response["prophetData"]): Promise<void>;

    /**
     * Approves modules needed by the accounting contract.
     *
     * @param modules an array of addresses for the modules to be approved
     */
    approveAccountingModules(modules: Address[]): Promise<void>;
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

/**
 * @interface DecodedLogArgsMap
 * Represents the mapping of event names to their respective argument structures.
 */
export interface DecodedLogArgsMap {
    /**
     * Event arguments for the RequestCreated event.
     * @property {RequestId} _requestId - The ID of the request.
     * @property {bigint} _epoch - The epoch time when the request was created.
     * @property {string} _chainId - The chain ID where the request was created.
     */
    RequestCreated: {
        _requestId: RequestId;
        _epoch: bigint;
        _chainId: string;
    };

    /**
     * Event arguments for the ResponseProposed event.
     * @property {RequestId} requestId - The ID of the request.
     * @property {string} responseId - The ID of the response.
     * @property {string} response - The response content.
     * @property {bigint} blockNumber - The block number when the response was proposed.
     */
    ResponseProposed: {
        requestId: RequestId;
        responseId: string;
        response: string;
        blockNumber: bigint;
    };

    /**
     * Event arguments for the ResponseDisputed event.
     * @property {string} responseId - The ID of the response.
     * @property {string} disputeId - The ID of the dispute.
     * @property {string} dispute - The dispute content.
     * @property {bigint} blockNumber - The block number when the dispute was raised.
     */
    ResponseDisputed: {
        responseId: string;
        disputeId: string;
        dispute: string;
        blockNumber: bigint;
    };

    /**
     * Event arguments for the DisputeStatusChanged event.
     * @property {string} disputeId - The ID of the dispute.
     * @property {string} dispute - The dispute content.
     * @property {number} status - The new status of the dispute.
     * @property {bigint} blockNumber - The block number when the dispute status changed.
     */
    DisputeStatusChanged: {
        disputeId: string;
        dispute: string;
        status: number;
        blockNumber: bigint;
    };

    /**
     * Event arguments for the DisputeEscalated event.
     * @property {string} caller - The address of the caller who escalated the dispute.
     * @property {string} disputeId - The ID of the dispute.
     * @property {bigint} blockNumber - The block number when the dispute was escalated.
     */
    DisputeEscalated: {
        caller: string;
        disputeId: string;
        blockNumber: bigint;
    };

    /**
     * Event arguments for the RequestFinalized event.
     * @property {RequestId} requestId - The ID of the request.
     * @property {string} responseId - The ID of the response.
     * @property {string} caller - The address of the caller who finalized the request.
     * @property {bigint} blockNumber - The block number when the request was finalized.
     */
    RequestFinalized: {
        requestId: RequestId;
        responseId: string;
        caller: string;
        blockNumber: bigint;
    };
}
