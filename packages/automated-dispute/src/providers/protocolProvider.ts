import { Caip2ChainId, Caip2Utils, InvalidChainId } from "@ebo-agent/blocknumber";
import {
    AbiEvent,
    Address,
    BaseError,
    ContractFunctionRevertedError,
    createPublicClient,
    createWalletClient,
    decodeAbiParameters,
    decodeEventLog,
    encodeAbiParameters,
    fallback,
    FallbackTransport,
    getContract,
    GetContractReturnType,
    Hex,
    http,
    HttpTransport,
    Log,
    PublicClient,
    WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";

import type {
    Dispute,
    EboEvent,
    EboEventName,
    Epoch,
    Request,
    RequestId,
    Response,
} from "../types/index.js";
import {
    bondEscalationModuleAbi,
    eboRequestCreatorAbi,
    epochManagerAbi,
    oracleAbi,
} from "../abis/index.js";
import {
    DecodeLogDataFailure,
    InvalidAccountOnClient,
    RpcUrlsEmpty,
    TransactionExecutionError,
    UnsupportedEvent,
} from "../exceptions/index.js";
import {
    DecodedLogArgsMap,
    IProtocolProvider,
    IReadProvider,
    IWriteProvider,
    ProtocolContractsAddresses,
} from "../interfaces/index.js";
import { ErrorFactory } from "../services/errorFactory.js";

type ProtocolRpcConfig = {
    urls: string[];
    transactionReceiptConfirmations: number;
    timeout: number;
    retryInterval: number;
};
export const REQUEST_RESPONSE_MODULE_DATA_ABI_FIELDS = [
    { name: "accountingExtension", type: "address" },
    { name: "bondToken", type: "address" },
    { name: "bondSize", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "disputeWindow", type: "uint256" },
] as const;

export const REQUEST_DISPUTE_MODULE_DATA_ABI_FIELDS = [
    { name: "accountingExtension", type: "address" },
    { name: "bondToken", type: "address" },
    { name: "bondSize", type: "uint256" },
    { name: "maxNumberOfEscalations", type: "uint256" },
    { name: "bondEscalationDeadline", type: "uint256" },
    { name: "tyingBuffer", type: "uint256" },
    { name: "disputeWindow", type: "uint256" },
] as const;

export const RESPONSE_ABI_FIELDS = [
    { name: "chainId", type: "string" },
    { name: "epoch", type: "uint256" },
    { name: "block", type: "uint256" },
] as const;

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
    private bondEscalationContract: GetContractReturnType<
        typeof bondEscalationModuleAbi,
        typeof this.writeClient,
        Address
    >;

    /**
     * Creates a new ProtocolProvider instance
     * @param rpcUrls The RPC URLs to connect to the Arbitrum chain
     * @param contracts The addresses of the protocol contracts that will be instantiated
     * @param privateKey The private key of the account that will be used to interact with the contracts
     */
    constructor(
        private readonly rpcConfig: ProtocolRpcConfig,
        contracts: ProtocolContractsAddresses,
        privateKey: Hex,
    ) {
        const { urls, timeout, retryInterval } = rpcConfig;

        if (urls.length === 0) {
            throw new RpcUrlsEmpty();
        }

        this.readClient = createPublicClient({
            chain: arbitrum,
            transport: fallback(
                urls.map((url) =>
                    http(url, {
                        timeout: timeout,
                        retryDelay: retryInterval,
                    }),
                ),
            ),
        });

        const account = privateKeyToAccount(privateKey);

        this.writeClient = createWalletClient({
            chain: arbitrum,
            transport: fallback(
                urls.map((url) =>
                    http(url, {
                        timeout: timeout,
                        retryDelay: retryInterval,
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
        this.bondEscalationContract = getContract({
            address: contracts.bondEscalationModule,
            abi: bondEscalationModuleAbi,
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
        approveAccountingModules: this.approveAccountingModules.bind(this),
    };

    public read: IReadProvider = {
        getCurrentEpoch: this.getCurrentEpoch.bind(this),
        getLastFinalizedBlock: this.getLastFinalizedBlock.bind(this),
        getEvents: this.getEvents.bind(this),
        getAvailableChains: this.getAvailableChains.bind(this),
        getAccountingModuleAddress: this.getAccountingModuleAddress.bind(this),
        getAccountingApprovedModules: this.getAccountingApprovedModules.bind(this),
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
    async getCurrentEpoch(): Promise<Epoch> {
        const [epoch, epochFirstBlockNumber] = await Promise.all([
            this.epochManagerContract.read.currentEpoch(),
            this.epochManagerContract.read.currentEpochBlock(),
        ]);

        const epochFirstBlock = await this.readClient.getBlock({
            blockNumber: epochFirstBlockNumber,
        });

        return {
            number: epoch,
            firstBlockNumber: epochFirstBlockNumber,
            startTimestamp: epochFirstBlock.timestamp,
        };
    }

    async getLastFinalizedBlock(): Promise<bigint> {
        const { number } = await this.readClient.getBlock({ blockTag: "finalized" });

        return number;
    }

    /**
     * Decodes the log data for a specific event.
     *
     * @param eventName - The name of the event to decode.
     * @param log - The log object containing the event data.
     * @returns The decoded log data as an object.
     * @throws {Error} If the event name is unsupported or if there's an error during decoding.
     */
    private decodeLogData<TEventName extends EboEventName>(
        eventName: TEventName,
        log: Log,
    ): DecodedLogArgsMap[TEventName] {
        let abi;
        switch (eventName) {
            case "RequestCreated":
                abi = eboRequestCreatorAbi;
                break;
            case "ResponseProposed":
                abi = oracleAbi;
                break;
            case "ResponseDisputed":
                abi = oracleAbi;
                break;
            case "DisputeStatusChanged":
                abi = oracleAbi;
                break;
            case "DisputeEscalated":
                abi = oracleAbi;
                break;
            case "RequestFinalized":
                abi = oracleAbi;
                break;
            default:
                throw new UnsupportedEvent(`Unsupported event name: ${eventName}`);
        }

        try {
            const decodedLog = decodeEventLog({
                abi,
                data: log.data,
                topics: log.topics,
                eventName,
                strict: false,
            });

            return decodedLog.args as DecodedLogArgsMap[TEventName];
        } catch (error) {
            throw new DecodeLogDataFailure(error);
        }
    }

    /**
     * Parses an Oracle event log into an EboEvent.
     *
     * @param eventName - The name of the event.
     * @param log - The event log to parse.
     * @returns An EboEvent object.
     */
    private parseOracleEvent(eventName: EboEventName, log: Log) {
        if (
            ![
                "ResponseProposed",
                "ResponseDisputed",
                "DisputeStatusChanged",
                "DisputeEscalated",
                "RequestFinalized",
            ].includes(eventName)
        ) {
            throw new UnsupportedEvent(`Unsupported event name: ${eventName}`);
        }

        const baseEvent = {
            name: eventName,
            blockNumber: log.blockNumber ?? BigInt(0),
            logIndex: log.logIndex ?? 0,
            rawLog: log,
            requestId: log.topics[1] as RequestId,
        };

        const decodedLog = this.decodeLogData(eventName, log);

        switch (eventName) {
            case "ResponseProposed":
                const responseProposedArgs = decodedLog as DecodedLogArgsMap["ResponseProposed"];
                return {
                    ...baseEvent,
                    metadata: {
                        requestId: responseProposedArgs.requestId,
                        responseId: responseProposedArgs.responseId,
                        response: responseProposedArgs.response,
                        blockNumber: responseProposedArgs.blockNumber,
                    },
                };
            case "ResponseDisputed":
                const responseDisputedArgs = decodedLog as DecodedLogArgsMap["ResponseDisputed"];
                return {
                    ...baseEvent,
                    metadata: {
                        responseId: responseDisputedArgs.responseId,
                        disputeId: responseDisputedArgs.disputeId,
                        dispute: responseDisputedArgs.dispute,
                        blockNumber: responseDisputedArgs.blockNumber,
                    },
                };
            case "DisputeStatusChanged":
                const disputeStatusChangedArgs =
                    decodedLog as DecodedLogArgsMap["DisputeStatusChanged"];
                return {
                    ...baseEvent,
                    metadata: {
                        disputeId: disputeStatusChangedArgs.disputeId,
                        dispute: disputeStatusChangedArgs.dispute,
                        status: disputeStatusChangedArgs.status,
                        blockNumber: disputeStatusChangedArgs.blockNumber,
                    },
                };
            case "DisputeEscalated":
                const disputeEscalatedArgs = decodedLog as DecodedLogArgsMap["DisputeEscalated"];
                return {
                    ...baseEvent,
                    metadata: {
                        caller: disputeEscalatedArgs.caller,
                        disputeId: disputeEscalatedArgs.disputeId,
                        blockNumber: disputeEscalatedArgs.blockNumber,
                    },
                };
            case "RequestFinalized":
                const requestFinalizedArgs = decodedLog as DecodedLogArgsMap["RequestFinalized"];
                return {
                    ...baseEvent,
                    metadata: {
                        requestId: requestFinalizedArgs.requestId,
                        responseId: requestFinalizedArgs.responseId,
                        caller: requestFinalizedArgs.caller,
                        blockNumber: requestFinalizedArgs.blockNumber,
                    },
                };
            default:
                throw new UnsupportedEvent(`Unsupported event name: ${eventName}`);
        }
    }

    /**
     * Fetches events from the Oracle contract.
     *
     * @param fromBlock - The starting block number to fetch events from.
     * @param toBlock - The ending block number to fetch events to.
     * @returns A promise that resolves to an array of EboEvents.
     */
    private async getOracleEvents(fromBlock: bigint, toBlock: bigint) {
        const eventNames = [
            "ResponseProposed",
            "ResponseDisputed",
            "DisputeStatusChanged",
            "DisputeEscalated",
            "RequestFinalized",
        ];
        const eventPromises = eventNames.map((eventName) =>
            this.readClient.getLogs({
                address: this.oracleContract.address,
                event: oracleAbi.find(
                    (e) => e.name === eventName && e.type === "event",
                ) as AbiEvent,
                fromBlock,
                toBlock,
            }),
        );

        const allLogs = await Promise.all(eventPromises);
        return allLogs.flatMap((logs: Log[], index: number) =>
            logs.map((log) => this.parseOracleEvent(eventNames[index] as EboEventName, log)),
        );
    }

    /**
     * Fetches events from the EBORequestCreator contract.
     *
     * @param fromBlock - The starting block number to fetch events from.
     * @param toBlock - The ending block number to fetch events to.
     * @returns A promise that resolves to an array of EboEvents.
     */

    private async getEBORequestCreatorEvents(fromBlock: bigint, toBlock: bigint) {
        const logs = await this.readClient.getLogs({
            address: this.eboRequestCreatorContract.address,
            event: eboRequestCreatorAbi.find(
                (e) => e.type === "event" && e.name === "RequestCreated",
            ) as AbiEvent,
            fromBlock,
            toBlock,
        });

        return logs.map((log: Log) => {
            const decodedLog = this.decodeLogData(
                "RequestCreated",
                log,
            ) as DecodedLogArgsMap["RequestCreated"];
            return {
                name: "RequestCreated" as const,
                blockNumber: log.blockNumber ?? BigInt(0),
                logIndex: log.logIndex ?? 0,
                rawLog: log,
                requestId: decodedLog.requestId,
                metadata: {
                    epoch: decodedLog.epoch,
                    chainId: decodedLog.chainId,
                    requestId: decodedLog.requestId,
                },
            };
        });
    }

    /**
     * Retrieves events from all relevant contracts within a specified block range.
     *
     * @param fromBlock - The starting block number to fetch events from.
     * @param toBlock - The ending block number to fetch events to.
     * @returns A promise that resolves to an array of EboEvents sorted by block number and log index.
     * @throws {Error} If the block range is invalid or if there's an error fetching events.
     */
    async getEvents(fromBlock: bigint, toBlock: bigint) {
        if (fromBlock > toBlock) {
            throw new Error("Invalid block range: fromBlock must be less than or equal to toBlock");
        }

        const [requestCreatorEvents, oracleEvents] = await Promise.all([
            this.getEBORequestCreatorEvents(fromBlock, toBlock),
            this.getOracleEvents(fromBlock, toBlock),
        ]);

        return this.mergeEventStreams(requestCreatorEvents, oracleEvents);
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

    // TODO: use Caip2 Chain ID instead of string in return type
    async getAvailableChains(): Promise<Caip2ChainId[]> {
        // TODO: implement actual method
        return ["eip155:1", "eip155:42161"];
    }

    getAccountingModuleAddress(): Address {
        // TODO: implement actual method
        return "0x01";
    }

    async getAccountingApprovedModules(): Promise<Address[]> {
        // TODO: implement actual method
        return [];
    }

    async approveAccountingModules(_modules: Address[]): Promise<void> {
        // TODO: implement actual method
    }

    /**
     * Decodes the Prophet's request responseModuleData bytes into an object.
     *
     * @param responseModuleData responseModuleData bytes
     * @throws {BaseErrorType} when the responseModuleData decoding fails
     * @returns a decoded object with responseModuleData properties
     */
    static decodeRequestResponseModuleData(
        responseModuleData: Request["prophetData"]["responseModuleData"],
    ): Request["decodedData"]["responseModuleData"] {
        const decodedParameters = decodeAbiParameters(
            REQUEST_RESPONSE_MODULE_DATA_ABI_FIELDS,
            responseModuleData,
        );

        return {
            accountingExtension: decodedParameters[0],
            bondToken: decodedParameters[1],
            bondSize: decodedParameters[2],
            deadline: decodedParameters[3],
            disputeWindow: decodedParameters[4],
        };
    }

    /**
     * Decodes the Prophet's request disputeModuelData bytes into an object.
     *
     * @param disputeModuelData disputeModuelData bytes
     * @throws {BaseErrorType} when the disputeModuelData decoding fails
     * @returns a decoded object with disputeModuelData properties
     */
    static decodeRequestDisputeModuleData(
        disputeModuleData: Request["prophetData"]["disputeModuleData"],
    ): Request["decodedData"]["disputeModuleData"] {
        const decodedParameters = decodeAbiParameters(
            REQUEST_DISPUTE_MODULE_DATA_ABI_FIELDS,
            disputeModuleData,
        );

        return {
            accountingExtension: decodedParameters[0],
            bondToken: decodedParameters[1],
            bondSize: decodedParameters[2],
            maxNumberOfEscalations: decodedParameters[3],
            bondEscalationDeadline: decodedParameters[4],
            tyingBuffer: decodedParameters[5],
            disputeWindow: decodedParameters[6],
        };
    }

    /**
     * Encodes a Prophet's response body object into bytes.
     *
     * @param response response body object
     * @returns byte-encode response body
     */
    static encodeResponse(
        response: Response["decodedData"]["response"],
    ): Response["prophetData"]["response"] {
        return encodeAbiParameters(RESPONSE_ABI_FIELDS, [
            response.chainId,
            response.epoch,
            response.block,
        ]);
    }

    /**
     * Decodes a Prophet's response body bytes into an object.
     *
     * @param response response body bytes
     * @returns decoded response body object
     */
    static decodeResponse(
        response: Response["prophetData"]["response"],
    ): Response["decodedData"]["response"] {
        const decodedParameters = decodeAbiParameters(RESPONSE_ABI_FIELDS, response);

        const chainId = decodedParameters[0];

        if (Caip2Utils.isCaip2ChainId(chainId)) {
            return {
                chainId: chainId,
                epoch: decodedParameters[1],
                block: decodedParameters[2],
            };
        } else {
            throw new InvalidChainId(
                `Could not decode response chain ID while decoding:\n${response}`,
            );
        }
    }

    // TODO: waiting for ChainId to be merged for _chains parameter
    /**
     * Creates a request on the EBO Request Creator contract by simulating the transaction
     * and then executing it if the simulation is successful.
     *
     * @param {bigint} epoch - The epoch for which the request is being created.
     * @param {Caip2ChainId[]} chains - An array of chain identifiers where the request should be created.
     * @throws {Error} Throws an error if the chains array is empty or if the transaction fails.
     * @throws {EBORequestCreator_InvalidEpoch} Throws if the epoch is invalid.
     * @throws {Oracle_InvalidRequestBody} Throws if the request body is invalid.
     * @throws {EBORequestModule_InvalidRequester} Throws if the requester is invalid.
     * @throws {EBORequestCreator_ChainNotAdded} Throws if the specified chain is not added.
     * @returns {Promise<void>} A promise that resolves when the request is successfully created.
     */
    async createRequest(epoch: bigint, chains: Caip2ChainId[]): Promise<void> {
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
                confirmations: this.rpcConfig.transactionReceiptConfirmations,
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
                confirmations: this.rpcConfig.transactionReceiptConfirmations,
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
                confirmations: this.rpcConfig.transactionReceiptConfirmations,
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

    /**
     * Pledges support for a dispute.
     *
     * @param {Request["prophetData"]} request - The request data for the dispute.
     * @param {Dispute["prophetData"]} dispute - The dispute data.
     * @throws {TransactionExecutionError} Throws if the transaction fails during execution.
     * @throws {ContractFunctionRevertedError} Throws if the contract function reverts.
     * @returns {Promise<void>}
     */
    async pledgeForDispute(
        request: Request["prophetData"],
        dispute: Dispute["prophetData"],
    ): Promise<void> {
        try {
            const { request: simulatedRequest } = await this.readClient.simulateContract({
                address: this.bondEscalationContract.address,
                abi: bondEscalationModuleAbi,
                functionName: "pledgeForDispute",
                args: [request, dispute],
                account: this.writeClient.account,
            });

            const hash = await this.writeClient.writeContract(simulatedRequest);

            const receipt = await this.readClient.waitForTransactionReceipt({
                hash,
                confirmations: this.rpcConfig.transactionReceiptConfirmations,
            });

            if (receipt.status !== "success") {
                throw new TransactionExecutionError("pledgeForDispute transaction failed");
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
     * Pledges against a dispute.
     *
     * @param {Request["prophetData"]} request - The request data for the dispute.
     * @param {Dispute["prophetData"]} dispute - The dispute data.
     * @throws {TransactionExecutionError} Throws if the transaction fails during execution.
     * @throws {ContractFunctionRevertedError} Throws if the contract function reverts.
     * @returns {Promise<void>}
     */
    async pledgeAgainstDispute(
        request: Request["prophetData"],
        dispute: Dispute["prophetData"],
    ): Promise<void> {
        try {
            const { request: simulatedRequest } = await this.readClient.simulateContract({
                address: this.bondEscalationContract.address,
                abi: bondEscalationModuleAbi,
                functionName: "pledgeAgainstDispute",
                args: [request, dispute],
                account: this.writeClient.account,
            });

            const hash = await this.writeClient.writeContract(simulatedRequest);

            const receipt = await this.readClient.waitForTransactionReceipt({
                hash,
                confirmations: this.rpcConfig.transactionReceiptConfirmations,
            });

            if (receipt.status !== "success") {
                throw new TransactionExecutionError("pledgeAgainstDispute transaction failed");
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
     * Settles a dispute by finalizing the response.
     *
     * @param {Request["prophetData"]} request - The request data.
     * @param {Response["prophetData"]} response - The response data.
     * @param {Dispute["prophetData"]} dispute - The dispute data.
     * @throws {TransactionExecutionError} Throws if the transaction fails during execution.
     * @throws {ContractFunctionRevertedError} Throws if the contract function reverts.
     * @returns {Promise<void>}
     */
    async settleDispute(
        request: Request["prophetData"],
        response: Response["prophetData"],
        dispute: Dispute["prophetData"],
    ): Promise<void> {
        try {
            const { request: simulatedRequest } = await this.readClient.simulateContract({
                address: this.bondEscalationContract.address,
                abi: bondEscalationModuleAbi,
                functionName: "settleBondEscalation",
                args: [request, response, dispute],
                account: this.writeClient.account,
            });

            const hash = await this.writeClient.writeContract(simulatedRequest);

            const receipt = await this.readClient.waitForTransactionReceipt({
                hash,
                confirmations: this.rpcConfig.transactionReceiptConfirmations,
            });

            if (receipt.status !== "success") {
                throw new TransactionExecutionError("settleBondEscalation transaction failed");
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
                confirmations: this.rpcConfig.transactionReceiptConfirmations,
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
                confirmations: this.rpcConfig.transactionReceiptConfirmations,
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
