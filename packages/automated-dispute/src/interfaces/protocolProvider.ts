import { Caip2ChainId } from "@ebo-agent/blocknumber";
import { Address, Block, Hex } from "viem";

import type {
    Dispute,
    DisputeId,
    EboEvent,
    EboEventName,
    Epoch,
    Request,
    RequestId,
    Response,
    ResponseId,
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
     * Gets the last finalized block.
     *
     * @returns A promise that resolves with the last finalized block.
     */
    getLastFinalizedBlock(): Promise<Block<bigint, boolean, "finalized">>;

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

    /**
     * Gets the list of approved modules' addresses for a given wallet address.
     *
     * @param user The address of the user.
     * @returns A promise that resolves with an array of approved modules for the user.
     */
    getApprovedModules(user: Address): Promise<Address[]>;
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
    createRequest(epoch: bigint, chains: Caip2ChainId): Promise<void>;

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

    /**
     * Approves a module in the accounting extension contract.
     *
     * @param module The address of the module to approve.
     * @returns A promise that resolves when the module is approved.
     */
    approveModule(module: Address): Promise<void>;
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
 * @type DecodedLogArgsMap
 * Represents the mapping of event names to their respective argument structures.
 */
export type DecodedLogArgsMap = {
    /**
     * Event arguments for the RequestCreated event.
     * @property {RequestId} requestId - The ID of the request.
     * @property {bigint} epoch - The epoch time when the request was created.
     * @property {Caip2ChainId} chainId - The chain ID where the request was created.
     */
    RequestCreated: {
        _requestId: RequestId;
        _epoch: bigint;
        _chainId: Caip2ChainId;
    };

    /**
     * Event arguments for the ResponseProposed event.
     * @property {RequestId} requestId - The ID of the request.
     * @property {ResponseId} responseId - The ID of the response.
     * @property {Hex} response - The response content.
     */
    ResponseProposed: {
        _requestId: RequestId;
        _responseId: ResponseId;
        _response: Hex;
    };

    /**
     * Event arguments for the ResponseDisputed event.
     * @property {ResponseId} responseId - The ID of the response.
     * @property {DisputeId} disputeId - The ID of the dispute.
     * @property {Hex} dispute - The dispute content.
     */
    ResponseDisputed: {
        _responseId: ResponseId;
        _disputeId: DisputeId;
        _dispute: Hex;
    };

    /**
     * Event arguments for the DisputeStatusUpdated event.
     * @property {DisputeId} disputeId - The ID of the dispute.
     * @property {Hex} dispute - The dispute content.
     * @property {number} status - The new status of the dispute.
     */
    DisputeStatusUpdated: {
        _disputeId: DisputeId;
        _dispute: Hex;
        _status: number;
    };

    /**
     * Event arguments for the DisputeEscalated event.
     * @property {string} caller - The address of the caller who escalated the dispute.
     * @property {string} disputeId - The ID of the dispute.
     * @property {Hex} dispute - The dispute
     */
    DisputeEscalated: {
        _caller: string;
        _disputeId: string;
        _dispute: Hex;
    };

    /**
     * Event arguments for the OracleRequestFinalized event.
     * @property {RequestId} requestId - The ID of the request.
     * @property {ResponseId} responseId - The ID of the response.
     * @property {Address} caller - The address of the caller who finalized the request.
     */
    OracleRequestFinalized: {
        _requestId: RequestId;
        _responseId: ResponseId;
        _caller: Address;
    };
};
