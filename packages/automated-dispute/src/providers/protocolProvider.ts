import { Timestamp } from "@ebo-agent/shared";
import {
    Address,
    BaseError,
    ContractFunctionRevertedError,
    createPublicClient,
    createWalletClient,
    fallback,
    FallbackTransport,
    getContract,
    GetContractReturnType,
    Hex,
    http,
    HttpTransport,
    PublicClient,
    WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";

import type { EboEvent, EboEventName } from "../types/events.js";
import type { Dispute, Request, Response } from "../types/prophet.js";
import { eboRequestCreatorAbi, epochManagerAbi, oracleAbi } from "../abis/index.js";
import {
    InvalidAccountOnClient,
    RpcUrlsEmpty,
    TransactionExecutionError,
} from "../exceptions/index.js";
import {
    IProtocolProvider,
    IReadProvider,
    IWriteProvider,
    ProtocolContractsAddresses,
} from "../interfaces/index.js";
import { ErrorFactory } from "../services/errorFactory.js";

// TODO: these constants should be env vars
const TRANSACTION_RECEIPT_CONFIRMATIONS = 1;
const TIMEOUT = 10000;
const RETRY_INTERVAL = 150;

export class ProtocolProvider implements IProtocolProvider {
    private readClient: PublicClient<FallbackTransport<HttpTransport[]>>;
    private writeClient: WalletClient<FallbackTransport<HttpTransport[]>>;
    private oracleContract: GetContractReturnType<
        typeof oracleAbi,
        typeof this.writeClient,
        Address
    >;
    private epochManagerContract: GetContractReturnType<
        typeof epochManagerAbi,
        typeof this.readClient,
        Address
    >;
    private eboRequestCreatorContract: GetContractReturnType<
        typeof eboRequestCreatorAbi,
        typeof this.writeClient,
        Address
    >;

    /**
     * Creates a new ProtocolProvider instance
     * @param rpcUrls The RPC URLs to connect to the Arbitrum chain
     * @param contracts The addresses of the protocol contracts that will be instantiated
     * @param privateKey The private key of the account that will be used to interact with the contracts
     */
    constructor(rpcUrls: string[], contracts: ProtocolContractsAddresses, privateKey: Hex) {
        if (rpcUrls.length === 0) {
            throw new RpcUrlsEmpty();
        }

        this.readClient = createPublicClient({
            chain: arbitrum,
            transport: fallback(
                rpcUrls.map((url) =>
                    http(url, {
                        timeout: TIMEOUT,
                        retryDelay: RETRY_INTERVAL,
                    }),
                ),
            ),
        });

        const account = privateKeyToAccount(privateKey);

        this.writeClient = createWalletClient({
            chain: arbitrum,
            transport: fallback(
                rpcUrls.map((url) =>
                    http(url, {
                        timeout: TIMEOUT,
                        retryDelay: RETRY_INTERVAL,
                    }),
                ),
            ),
            account: account,
        });

        // Instantiate all the protocol contracts
        this.oracleContract = getContract({
            address: contracts.oracle,
            abi: oracleAbi,
            client: this.writeClient,
        });
        this.epochManagerContract = getContract({
            address: contracts.epochManager,
            abi: epochManagerAbi,
            client: this.readClient,
        });
        this.eboRequestCreatorContract = getContract({
            address: contracts.eboRequestCreator,
            abi: eboRequestCreatorAbi,
            client: {
                public: this.readClient,
                wallet: this.writeClient,
            },
        });
    }

    public write: IWriteProvider = {
        createRequest: this.createRequest.bind(this),
        proposeResponse: this.proposeResponse.bind(this),
        disputeResponse: this.disputeResponse.bind(this),
        pledgeForDispute: this.pledgeForDispute.bind(this),
        pledgeAgainstDispute: this.pledgeAgainstDispute.bind(this),
        settleDispute: this.settleDispute.bind(this),
        escalateDispute: this.escalateDispute.bind(this),
        finalize: this.finalize.bind(this),
    };

    public read: IReadProvider = {
        getCurrentEpoch: this.getCurrentEpoch.bind(this),
        getLastFinalizedBlock: this.getLastFinalizedBlock.bind(this),
        getEvents: this.getEvents.bind(this),
        hasStakedAssets: this.hasStakedAssets.bind(this),
        getAvailableChains: this.getAvailableChains.bind(this),
    };

    /**
     * Returns the address of the account used for transactions.
     *
     * @returns {Address} The account address.
     */
    public getAccountAddress(): Address {
        if (!this.writeClient.account) {
            throw new InvalidAccountOnClient();
        }
        return this.writeClient.account.address;
    }

    /**
     * Gets the current epoch, the block number and its timestamp of the current epoch
     *
     * @returns The current epoch, its block number and its timestamp
     */
    async getCurrentEpoch(): Promise<{
        currentEpoch: bigint;
        currentEpochBlockNumber: bigint;
        currentEpochTimestamp: Timestamp;
    }> {
        const [currentEpoch, currentEpochBlockNumber] = await Promise.all([
            this.epochManagerContract.read.currentEpoch(),
            this.epochManagerContract.read.currentEpochBlock(),
        ]);

        const currentEpochBlock = await this.readClient.getBlock({
            blockNumber: currentEpochBlockNumber,
        });

        return {
            currentEpoch,
            currentEpochBlockNumber,
            currentEpochTimestamp: currentEpochBlock.timestamp,
        };
    }

    async getLastFinalizedBlock(): Promise<bigint> {
        const { number } = await this.readClient.getBlock({ blockTag: "finalized" });

        return number;
    }

    async getEvents(_fromBlock: bigint, _toBlock: bigint): Promise<EboEvent<EboEventName>[]> {
        // TODO: implement actual method.
        //
        // We should decode events using the corresponding ABI and also "fabricate" new events
        // if for some triggers there are no events (e.g. dispute window ended)
        const eboRequestCreatorEvents: EboEvent<EboEventName>[] = [];

        const oracleEvents = [
            {
                name: "ResponseProposed",
                blockNumber: 2n,
                logIndex: 1,
                requestId: "0x01",
                metadata: {
                    requestId: "0x01",
                    responseId: "0x02",
                    response: {
                        proposer: "0x12345678901234567890123456789012",
                        requestId: "0x01",
                        response: {
                            block: 1n,
                            chainId: "eip155:1",
                            epoch: 20n,
                        },
                    },
                },
            } as EboEvent<"ResponseProposed">,
            {
                name: "ResponseDisputed",
                blockNumber: 3n,
                logIndex: 1,
                requestId: "0x01",
                metadata: {
                    requestId: "0x01",
                    responseId: "0x02",
                    disputeId: "0x03",
                    dispute: {
                        disputer: "0x12345678901234567890123456789012",
                        proposer: "0x12345678901234567890123456789012",
                        responseId: "0x02",
                        requestId: "0x01",
                    },
                },
            } as EboEvent<"ResponseDisputed">,
        ];

        return this.mergeEventStreams(eboRequestCreatorEvents, oracleEvents);
    }

    /**
     * Merge multiple streams of events considering the chain order, based on their block numbers
     * and log indexes.
     *
     * @param streams a collection of EboEvent[] arrays.
     * @returns the EboEvent[] arrays merged in a single array and sorted by ascending blockNumber
     *  and logIndex
     */
    private mergeEventStreams(...streams: EboEvent<EboEventName>[][]) {
        return streams
            .reduce((acc, curr) => acc.concat(curr), [])
            .sort((a, b) => {
                if (a.blockNumber < b.blockNumber) return 1;
                if (a.blockNumber > b.blockNumber) return -1;

                if (a.logIndex < b.logIndex) return 1;
                if (a.logIndex > b.logIndex) return -1;

                return 0;
            });
    }

    async hasStakedAssets(_address: Address): Promise<boolean> {
        // TODO: implement actual method.
        return true;
    }

    // TODO: use Caip2 Chain ID instead of string in return type
    async getAvailableChains(): Promise<string[]> {
        // TODO: implement actual method
        return ["eip155:1", "eip155:42161"];
    }

    // TODO: waiting for ChainId to be merged for _chains parameter
    /**
     * Creates a request on the EBO Request Creator contract by simulating the transaction
     * and then executing it if the simulation is successful.
     *
     * @param {bigint} epoch - The epoch for which the request is being created.
     * @param {string[]} chains - An array of chain identifiers where the request should be created.
     * @throws {Error} Throws an error if the chains array is empty or if the transaction fails.
     * @throws {EBORequestCreator_InvalidEpoch} Throws if the epoch is invalid.
     * @throws {Oracle_InvalidRequestBody} Throws if the request body is invalid.
     * @throws {EBORequestModule_InvalidRequester} Throws if the requester is invalid.
     * @throws {EBORequestCreator_ChainNotAdded} Throws if the specified chain is not added.
     * @returns {Promise<void>} A promise that resolves when the request is successfully created.
     */
    async createRequest(epoch: bigint, chains: string[]): Promise<void> {
        if (chains.length === 0) {
            throw new Error("Chains array cannot be empty");
        }

        try {
            const { request } = await this.readClient.simulateContract({
                address: this.eboRequestCreatorContract.address,
                abi: eboRequestCreatorAbi,
                functionName: "createRequests",
                args: [epoch, chains],
                account: this.writeClient.account,
            });

            const hash = await this.writeClient.writeContract(request);

            const receipt = await this.readClient.waitForTransactionReceipt({
                hash,
                confirmations: TRANSACTION_RECEIPT_CONFIRMATIONS,
            });

            if (receipt.status !== "success") {
                throw new TransactionExecutionError("createRequest transaction failed");
            }
        } catch (error) {
            if (error instanceof BaseError) {
                const revertError = error.walk(
                    (err) => err instanceof ContractFunctionRevertedError,
                );
                if (revertError instanceof ContractFunctionRevertedError) {
                    const errorName = revertError.data?.errorName ?? "";
                    throw ErrorFactory.createError(errorName);
                }
            }
            throw error;
        }
    }

    /**
     * Proposes a response for a given request.
     *
     * @param {Request["prophetData"]} request - The request data.
     * @param {Response["prophetData"]} response - The response data to propose.
     * @throws {TransactionExecutionError} Throws if the transaction fails during execution.
     * @throws {ContractFunctionRevertedError} Throws if the contract function reverts.
     * @returns {Promise<void>}
     */
    async proposeResponse(
        request: Request["prophetData"],
        response: Response["prophetData"],
    ): Promise<void> {
        try {
            const { request: simulatedRequest } = await this.readClient.simulateContract({
                address: this.oracleContract.address,
                abi: oracleAbi,
                functionName: "proposeResponse",
                args: [request, response],
                account: this.writeClient.account,
            });

            const hash = await this.writeClient.writeContract(simulatedRequest);

            const receipt = await this.readClient.waitForTransactionReceipt({
                hash,
                confirmations: TRANSACTION_RECEIPT_CONFIRMATIONS,
            });

            if (receipt.status !== "success") {
                throw new TransactionExecutionError("proposeResponse transaction failed");
            }
        } catch (error) {
            if (error instanceof BaseError) {
                const revertError = error.walk(
                    (err) => err instanceof ContractFunctionRevertedError,
                );
                if (revertError instanceof ContractFunctionRevertedError) {
                    const errorName = revertError.data?.errorName ?? "";
                    throw ErrorFactory.createError(errorName);
                }
            }
            throw error;
        }
    }

    /**
     * Disputes a proposed response.
     *
     * @param {Request["prophetData"]} request - The request data.
     * @param {Response["prophetData"]} response - The response data to dispute.
     * @param {Dispute["prophetData"]} dispute - The dispute data.
     * @throws {TransactionExecutionError} Throws if the transaction fails during execution.
     * @throws {ContractFunctionRevertedError} Throws if the contract function reverts.
     * @returns {Promise<void>}
     */
    async disputeResponse(
        request: Request["prophetData"],
        response: Response["prophetData"],
        dispute: Dispute["prophetData"],
    ): Promise<void> {
        try {
            const { request: simulatedRequest } = await this.readClient.simulateContract({
                address: this.oracleContract.address,
                abi: oracleAbi,
                functionName: "disputeResponse",
                args: [request, response, dispute],
                account: this.writeClient.account,
            });

            const hash = await this.writeClient.writeContract(simulatedRequest);

            const receipt = await this.readClient.waitForTransactionReceipt({
                hash,
                confirmations: TRANSACTION_RECEIPT_CONFIRMATIONS,
            });

            if (receipt.status !== "success") {
                throw new TransactionExecutionError("disputeResponse transaction failed");
            }
        } catch (error) {
            if (error instanceof BaseError) {
                const revertError = error.walk(
                    (err) => err instanceof ContractFunctionRevertedError,
                );
                if (revertError instanceof ContractFunctionRevertedError) {
                    const errorName = revertError.data?.errorName ?? "";
                    throw ErrorFactory.createError(errorName);
                }
            }
            throw error;
        }
    }

    async pledgeForDispute(
        _request: Request["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void> {
        // TODO: implement actual method
        return;
    }

    async pledgeAgainstDispute(
        _request: Request["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void> {
        // TODO: implement actual method
        return;
    }

    async settleDispute(
        _request: Request["prophetData"],
        _response: Response["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void> {
        // TODO: implement actual method
        return;
    }

    /**
     * Escalates a dispute to a higher authority.
     *
     * This function simulates the `escalateDispute` call on the Oracle contract
     * to validate that the transaction will succeed. If the simulation is successful, the transaction
     * is executed by the `writeContract` method of the wallet client. The function also handles any
     * potential errors that may occur during the simulation or transaction execution.
     *
     * @param {Request["prophetData"]} request - The request data.
     * @param {Response["prophetData"]} response - The response data.
     * @param {Dispute["prophetData"]} dispute - The dispute data.
     * @throws {TransactionExecutionError} Throws if the transaction fails during execution.
     * @throws {ContractFunctionRevertedError} Throws if the contract function reverts.
     * @returns {Promise<void>}
     */
    async escalateDispute(
        request: Request["prophetData"],
        response: Response["prophetData"],
        dispute: Dispute["prophetData"],
    ): Promise<void> {
        try {
            const { request: simulatedRequest } = await this.readClient.simulateContract({
                address: this.oracleContract.address,
                abi: oracleAbi,
                functionName: "escalateDispute",
                args: [request, response, dispute],
                account: this.writeClient.account,
            });

            const hash = await this.writeClient.writeContract(simulatedRequest);

            const receipt = await this.readClient.waitForTransactionReceipt({
                hash,
                confirmations: TRANSACTION_RECEIPT_CONFIRMATIONS,
            });

            if (receipt.status !== "success") {
                throw new TransactionExecutionError("escalateDispute transaction failed");
            }
        } catch (error) {
            if (error instanceof BaseError) {
                const revertError = error.walk(
                    (err) => err instanceof ContractFunctionRevertedError,
                );
                if (revertError instanceof ContractFunctionRevertedError) {
                    const errorName = revertError.data?.errorName ?? "";
                    throw ErrorFactory.createError(errorName);
                }
            }
            throw error;
        }
    }

    /**
     * Finalizes a request with a given response.
     *
     * This function simulates the `finalize` call on the Oracle contract
     * to validate that the transaction will succeed. If the simulation is successful, the transaction
     * is executed by the `writeContract` method of the wallet client. The function also handles any
     * potential errors that may occur during the simulation or transaction execution.
     *
     * @param {Request["prophetData"]} request - The request data.
     * @param {Response["prophetData"]} response - The response data to finalize.
     * @throws {TransactionExecutionError} Throws if the transaction fails during execution.
     * @throws {ContractFunctionRevertedError} Throws if the contract function reverts.
     * @returns {Promise<void>}
     */

    async finalize(
        request: Request["prophetData"],
        response: Response["prophetData"],
    ): Promise<void> {
        try {
            const { request: simulatedRequest } = await this.readClient.simulateContract({
                address: this.oracleContract.address,
                abi: oracleAbi,
                functionName: "finalize",
                args: [request, response],
                account: this.writeClient.account,
            });

            const hash = await this.writeClient.writeContract(simulatedRequest);

            const receipt = await this.readClient.waitForTransactionReceipt({
                hash,
                confirmations: TRANSACTION_RECEIPT_CONFIRMATIONS,
            });

            if (receipt.status !== "success") {
                throw new TransactionExecutionError("finalize transaction failed");
            }
        } catch (error) {
            if (error instanceof BaseError) {
                const revertError = error.walk(
                    (err) => err instanceof ContractFunctionRevertedError,
                );
                if (revertError instanceof ContractFunctionRevertedError) {
                    const errorName = revertError.data?.errorName ?? "";
                    throw ErrorFactory.createError(errorName);
                }
            }
            throw error;
        }
    }
}
