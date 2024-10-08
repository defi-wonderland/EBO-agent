import { Caip2ChainId } from "@ebo-agent/blocknumber/src/index.js";
import {
    Address,
    BaseError,
    Chain,
    ContractFunctionRevertedError,
    createPublicClient,
    createWalletClient,
    decodeAbiParameters,
    encodeAbiParameters,
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
import { arbitrum, mainnet } from "viem/chains";

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
import {
    bondEscalationModuleAbi,
    eboRequestCreatorAbi,
    epochManagerAbi,
    horizonAccountingExtensionAbi,
    oracleAbi,
} from "../abis/index.js";
import {
    ErrorFactory,
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

type RpcConfig = {
    urls: string[];
    transactionReceiptConfirmations: number;
    timeout: number;
    retryInterval: number;
};

type ProtocolRpcConfig = {
    l1: RpcConfig;
    l2: RpcConfig;
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

export const RESPONSE_ABI_FIELDS = [{ name: "block", type: "uint256" }] as const;

export class ProtocolProvider implements IProtocolProvider {
    private l1ReadClient: PublicClient<FallbackTransport<HttpTransport[]>>;
    private l2ReadClient: PublicClient<FallbackTransport<HttpTransport[]>>;
    private l2WriteClient: WalletClient<FallbackTransport<HttpTransport[]>>;

    private oracleContract: GetContractReturnType<
        typeof oracleAbi,
        typeof this.l2WriteClient,
        Address
    >;

    private epochManagerContract: GetContractReturnType<
        typeof epochManagerAbi,
        typeof this.l2ReadClient,
        Address
    >;

    private eboRequestCreatorContract: GetContractReturnType<
        typeof eboRequestCreatorAbi,
        typeof this.l2WriteClient,
        Address
    >;

    private bondEscalationContract: GetContractReturnType<
        typeof bondEscalationModuleAbi,
        typeof this.l2WriteClient,
        Address
    >;

    private horizonAccountingExtensionContract: GetContractReturnType<
        typeof horizonAccountingExtensionAbi,
        typeof this.l2WriteClient,
        Address
    >;

    /**
     * Creates a new ProtocolProvider instance
     * @param rpcConfig The configuration for RPC connections including URLs, timeout, retry interval, and transaction receipt confirmations
     * @param contracts The addresses of the protocol contracts that will be instantiated
     * @param privateKey The private key of the account that will be used to interact with the contracts
     */
    constructor(
        private readonly rpcConfig: ProtocolRpcConfig,
        contracts: ProtocolContractsAddresses,
        privateKey: Hex,
    ) {
        this.l1ReadClient = this.createReadClient(rpcConfig.l1, mainnet);
        this.l2ReadClient = this.createReadClient(rpcConfig.l2, arbitrum);
        this.l2WriteClient = this.createWriteClient(rpcConfig.l2, arbitrum, privateKey);

        // Instantiate all the protocol contracts
        this.oracleContract = getContract({
            address: contracts.oracle,
            abi: oracleAbi,
            client: this.l2WriteClient,
        });
        this.epochManagerContract = getContract({
            address: contracts.epochManager,
            abi: epochManagerAbi,
            client: this.l2ReadClient,
        });
        this.eboRequestCreatorContract = getContract({
            address: contracts.eboRequestCreator,
            abi: eboRequestCreatorAbi,
            client: {
                public: this.l2ReadClient,
                wallet: this.l2WriteClient,
            },
        });
        this.bondEscalationContract = getContract({
            address: contracts.bondEscalationModule,
            abi: bondEscalationModuleAbi,
            client: {
                public: this.l2ReadClient,
                wallet: this.l2WriteClient,
            },
        });
        this.horizonAccountingExtensionContract = getContract({
            address: contracts.horizonAccountingExtension,
            abi: horizonAccountingExtensionAbi,
            client: {
                public: this.l2ReadClient,
                wallet: this.l2WriteClient,
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
        approveModule: this.approveModule.bind(this),
    };

    public read: IReadProvider = {
        getCurrentEpoch: this.getCurrentEpoch.bind(this),
        getLastFinalizedBlock: this.getLastFinalizedBlock.bind(this),
        getEvents: this.getEvents.bind(this),
        getAvailableChains: this.getAvailableChains.bind(this),
        getAccountingModuleAddress: this.getAccountingModuleAddress.bind(this),
        getAccountingApprovedModules: this.getAccountingApprovedModules.bind(this),
        getApprovedModules: this.getApprovedModules.bind(this),
    };

    private createReadClient(
        config: RpcConfig,
        chain: Chain,
    ): PublicClient<FallbackTransport<HttpTransport[]>> {
        const { urls, timeout, retryInterval } = config;

        if (urls.length === 0) {
            throw new RpcUrlsEmpty();
        }

        return createPublicClient({
            chain: chain,
            transport: fallback(
                urls.map((url) =>
                    http(url, {
                        timeout: timeout,
                        retryDelay: retryInterval,
                    }),
                ),
            ),
        });
    }

    private createWriteClient(
        config: RpcConfig,
        chain: Chain,
        privateKey: Hex,
    ): WalletClient<FallbackTransport<HttpTransport[]>> {
        const { urls, timeout, retryInterval } = config;
        const account = privateKeyToAccount(privateKey);

        return createWalletClient({
            chain: chain,
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
    }

    /**
     * Returns the address of the account used for transactions.
     *
     * @returns {Address} The account address.
     * @throws {InvalidAccountOnClient} Throws if the write client does not have an assigned account.
     */
    public getAccountAddress(): Address {
        if (!this.l2WriteClient.account) {
            throw new InvalidAccountOnClient();
        }
        return this.l2WriteClient.account.address;
    }

    /**
     * Gets the current epoch, including the block number and its timestamp.
     *
     * NOTE: this method works on L1 block numbers as EpochManager contract uses blocks from L1.
     *
     * @returns {Promise<Epoch>} The current epoch, its block number, and its timestamp.
     */
    async getCurrentEpoch(): Promise<Epoch> {
        const [epoch, epochFirstBlockNumber] = await Promise.all([
            this.epochManagerContract.read.currentEpoch(),
            this.epochManagerContract.read.currentEpochBlock(),
        ]);

        const epochFirstBlock = await this.l1ReadClient.getBlock({
            blockNumber: epochFirstBlockNumber,
        });

        return {
            number: epoch,
            firstBlockNumber: epochFirstBlockNumber,
            startTimestamp: epochFirstBlock.timestamp,
        };
    }

    /**
     * Gets the number of the last finalized block.
     *
     * @returns {Promise<bigint>} The block number of the last finalized block.
     */
    async getLastFinalizedBlock(): Promise<bigint> {
        const { number } = await this.l2ReadClient.getBlock({ blockTag: "finalized" });

        return number;
    }

    /**
     * Gets a list of events between two blocks.
     *
     * @param {bigint} _fromBlock - The starting block number.
     * @param {bigint} _toBlock - The ending block number.
     * @returns {Promise<EboEvent<EboEventName>[]>} A list of EBO events.
     */
    async getEvents(_fromBlock: bigint, _toBlock: bigint): Promise<EboEvent<EboEventName>[]> {
        // TODO: implement actual method.
        //
        // We should decode events using the corresponding ABI and also "fabricate" new events
        // if for some triggers there are no events (e.g. dispute window ended)
        const eboRequestCreatorEvents: EboEvent<EboEventName>[] = [];

        const oracleEvents = [
            {
                name: "ResponseDisputed",
                blockNumber: 3n,
                logIndex: 1,
                requestId: "0x01" as RequestId,
                metadata: {
                    requestId: "0x01" as RequestId,
                    responseId: "0x02" as ResponseId,
                    disputeId: "0x03" as DisputeId,
                    dispute: {
                        disputer: "0x12345678901234567890123456789012",
                        proposer: "0x12345678901234567890123456789012",
                        responseId: "0x02" as ResponseId,
                        requestId: "0x01" as RequestId,
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
     * @param {EboEvent<EboEventName>[][]} streams - A collection of EboEvent[] arrays.
     * @returns {EboEvent<EboEventName>[]} The merged and sorted event array.
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
        return ["eip155:42161"];
    }

    getAccountingModuleAddress(): Address {
        // TODO: implement actual method
        return "0x01";
    }

    /**
     * Approves a module in the accounting extension contract.
     *
     * @param {Address} module - The address of the module to approve.
     * @throws {TransactionExecutionError} Throws if the transaction fails during execution.
     * @returns {Promise<void>} A promise that resolves when the module is approved.
     */
    async approveModule(module: Address): Promise<void> {
        const { request: simulatedRequest } = await this.l2ReadClient.simulateContract({
            address: this.horizonAccountingExtensionContract.address,
            abi: horizonAccountingExtensionAbi,
            functionName: "approveModule",
            args: [module],
            account: this.l2WriteClient.account,
        });

        const hash = await this.l2WriteClient.writeContract(simulatedRequest);

        const { transactionReceiptConfirmations } = this.rpcConfig.l2;
        const receipt = await this.l2ReadClient.waitForTransactionReceipt({
            hash,
            confirmations: transactionReceiptConfirmations,
        });

        if (receipt.status !== "success") {
            throw new TransactionExecutionError("approveModule transaction failed");
        }
    }

    /**
     * Gets the list of approved modules' addresses for a given user.
     *
     * @param {Address} user - The address of the user.
     * @returns {Promise<Address[]>} A promise that resolves with an array of approved modules for the user.
     */
    async getApprovedModules(user: Address): Promise<Address[]> {
        return [...(await this.horizonAccountingExtensionContract.read.approvedModules([user]))];
    }

    async getAccountingApprovedModules(): Promise<Address[]> {
        // TODO: implement actual method
        return [];
    }

    async approveAccountingModules(_modules: Address[]): Promise<void> {
        // TODO: implement actual method
    }

    /**
     * Decodes the request's response module data bytes into an object.
     *
     * @param {Request["prophetData"]["responseModuleData"]} responseModuleData - The response module data bytes.
     * @returns {Request["decodedData"]["responseModuleData"]} A decoded object with responseModuleData properties.
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
     * Decodes the request's dispute module data bytes into an object.
     *
     * @param {Request["prophetData"]["disputeModuleData"]} disputeModuleData - The dispute module data bytes.
     * @returns {Request["decodedData"]["disputeModuleData"]} A decoded object with disputeModuleData properties.
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
     * Encodes a response object into bytes.
     *
     * @param {Response["decodedData"]["response"]} response - The response object to encode.
     * @returns {Response["prophetData"]["response"]} Byte-encoded response body.
     */
    static encodeResponse(
        response: Response["decodedData"]["response"],
    ): Response["prophetData"]["response"] {
        return encodeAbiParameters(RESPONSE_ABI_FIELDS, [response.block]);
    }

    /**
     * Decodes a response body bytes into an object.
     *
     * @param {Response["prophetData"]["response"]} response - The response body bytes.
     * @returns {Response["decodedData"]["response"]} Decoded response body object.
     */
    static decodeResponse(
        response: Response["prophetData"]["response"],
    ): Response["decodedData"]["response"] {
        const decodedParameters = decodeAbiParameters(RESPONSE_ABI_FIELDS, response);

        return {
            block: decodedParameters[0],
        };
    }

    // TODO: waiting for ChainId to be merged for _chains parameter
    /**
     * Creates a request on the EBO Request Creator contract by simulating the transaction
     * and then executing it if the simulation is successful.
     *
     * @param {bigint} epoch - The epoch for which the request is being created.
     * @param {Caip2ChainId} chain - A chain identifier for which the request should be created.
     * @throws {Error} Throws an error if the chains array is empty or if the transaction fails.
     * @returns {Promise<void>} A promise that resolves when the request is successfully created.
     */
    async createRequest(epoch: bigint, chain: Caip2ChainId): Promise<void> {
        const { request } = await this.l2ReadClient.simulateContract({
            address: this.eboRequestCreatorContract.address,
            abi: eboRequestCreatorAbi,
            functionName: "createRequest",
            args: [epoch, chain],
            account: this.l2WriteClient.account,
        });

        const hash = await this.l2WriteClient.writeContract(request);

        const { transactionReceiptConfirmations } = this.rpcConfig.l2;
        const receipt = await this.l2ReadClient.waitForTransactionReceipt({
            hash,
            confirmations: transactionReceiptConfirmations,
        });

        if (receipt.status !== "success") {
            throw new TransactionExecutionError("createRequest transaction failed");
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
        const { request: simulatedRequest } = await this.l2ReadClient.simulateContract({
            address: this.oracleContract.address,
            abi: oracleAbi,
            functionName: "proposeResponse",
            args: [request, response],
            account: this.l2WriteClient.account,
        });

        const hash = await this.l2WriteClient.writeContract(simulatedRequest);

        const { transactionReceiptConfirmations } = this.rpcConfig.l2;
        const receipt = await this.l2ReadClient.waitForTransactionReceipt({
            hash,
            confirmations: transactionReceiptConfirmations,
        });

        if (receipt.status !== "success") {
            throw new TransactionExecutionError("proposeResponse transaction failed");
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
        const { request: simulatedRequest } = await this.l2ReadClient.simulateContract({
            address: this.oracleContract.address,
            abi: oracleAbi,
            functionName: "disputeResponse",
            args: [request, response, dispute],
            account: this.l2WriteClient.account,
        });

        const hash = await this.l2WriteClient.writeContract(simulatedRequest);

        const { transactionReceiptConfirmations } = this.rpcConfig.l2;
        const receipt = await this.l2ReadClient.waitForTransactionReceipt({
            hash,
            confirmations: transactionReceiptConfirmations,
        });

        if (receipt.status !== "success") {
            throw new TransactionExecutionError("disputeResponse transaction failed");
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
            const { request: simulatedRequest } = await this.l2ReadClient.simulateContract({
                address: this.bondEscalationContract.address,
                abi: bondEscalationModuleAbi,
                functionName: "pledgeForDispute",
                args: [request, dispute],
                account: this.l2WriteClient.account,
            });

            const hash = await this.l2WriteClient.writeContract(simulatedRequest);

            const { transactionReceiptConfirmations } = this.rpcConfig.l2;
            const receipt = await this.l2ReadClient.waitForTransactionReceipt({
                hash,
                confirmations: transactionReceiptConfirmations,
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
            const { request: simulatedRequest } = await this.l2ReadClient.simulateContract({
                address: this.bondEscalationContract.address,
                abi: bondEscalationModuleAbi,
                functionName: "pledgeAgainstDispute",
                args: [request, dispute],
                account: this.l2WriteClient.account,
            });

            const hash = await this.l2WriteClient.writeContract(simulatedRequest);

            const { transactionReceiptConfirmations } = this.rpcConfig.l2;
            const receipt = await this.l2ReadClient.waitForTransactionReceipt({
                hash,
                confirmations: transactionReceiptConfirmations,
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
            const { request: simulatedRequest } = await this.l2ReadClient.simulateContract({
                address: this.bondEscalationContract.address,
                abi: bondEscalationModuleAbi,
                functionName: "settleBondEscalation",
                args: [request, response, dispute],
                account: this.l2WriteClient.account,
            });

            const hash = await this.l2WriteClient.writeContract(simulatedRequest);

            const { transactionReceiptConfirmations } = this.rpcConfig.l2;
            const receipt = await this.l2ReadClient.waitForTransactionReceipt({
                hash,
                confirmations: transactionReceiptConfirmations,
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
        const { request: simulatedRequest } = await this.l2ReadClient.simulateContract({
            address: this.oracleContract.address,
            abi: oracleAbi,
            functionName: "escalateDispute",
            args: [request, response, dispute],
            account: this.l2WriteClient.account,
        });

        const hash = await this.l2WriteClient.writeContract(simulatedRequest);

        const { transactionReceiptConfirmations } = this.rpcConfig.l2;
        const receipt = await this.l2ReadClient.waitForTransactionReceipt({
            hash,
            confirmations: transactionReceiptConfirmations,
        });

        if (receipt.status !== "success") {
            throw new TransactionExecutionError("escalateDispute transaction failed");
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
        const { request: simulatedRequest } = await this.l2ReadClient.simulateContract({
            address: this.oracleContract.address,
            abi: oracleAbi,
            functionName: "finalize",
            args: [request, response],
            account: this.l2WriteClient.account,
        });

        const hash = await this.l2WriteClient.writeContract(simulatedRequest);

        const { transactionReceiptConfirmations } = this.rpcConfig.l2;
        const receipt = await this.l2ReadClient.waitForTransactionReceipt({
            hash,
            confirmations: transactionReceiptConfirmations,
        });

        if (receipt.status !== "success") {
            throw new TransactionExecutionError("finalize transaction failed");
        }
    }
}
