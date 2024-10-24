import { UnsupportedChain } from "@ebo-agent/blocknumber";
import { Caip2ChainId, HexUtils, UnixTimestamp } from "@ebo-agent/shared";
import {
    Address,
    BaseError,
    Block,
    Chain,
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
    Log,
    PublicClient,
    WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum, arbitrumSepolia, mainnet, sepolia } from "viem/chains";

import type {
    Dispute,
    DisputeId,
    DisputeStatus,
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
    InvalidBlockHashError,
    InvalidBlockRangeError,
    RpcUrlsEmpty,
    TransactionExecutionError,
    UnknownDisputeStatus,
} from "../exceptions/index.js";
import { ProphetCodec } from "../external.js";
import {
    IProtocolProvider,
    IReadProvider,
    IWriteProvider,
    ProtocolContractsAddresses,
} from "../interfaces/index.js";

type RpcConfig = {
    chainId: Caip2ChainId;
    urls: string[];
    transactionReceiptConfirmations: number;
    timeout: number;
    retryInterval: number;
};

type ProtocolRpcConfig = {
    l1: RpcConfig;
    l2: RpcConfig;
};

// TODO: add default caching strategy for RPC client

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
        const l1Chain = this.getViemChain(rpcConfig.l1.chainId);
        const l2Chain = this.getViemChain(rpcConfig.l2.chainId);

        this.l1ReadClient = this.createReadClient(rpcConfig.l1, l1Chain);
        this.l2ReadClient = this.createReadClient(rpcConfig.l2, l2Chain);
        this.l2WriteClient = this.createWriteClient(rpcConfig.l2, l2Chain, privateKey);

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

    private getViemChain(chainId: Caip2ChainId): Chain {
        switch (chainId) {
            case "eip155:1":
                return mainnet;

            case "eip155:11155111":
                return sepolia;

            case "eip155:42161":
                return arbitrum;

            case "eip155:421614":
                return arbitrumSepolia;

            default:
                throw new UnsupportedChain(chainId);
        }
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
            startTimestamp: epochFirstBlock.timestamp as UnixTimestamp,
        };
    }

    /** @inheritdoc */
    async getLastFinalizedBlock(): Promise<Block<bigint, false, "finalized">> {
        return await this.l2ReadClient.getBlock({ blockTag: "finalized" });
    }

    /**
     * Fetches the timestamp for a given event by using its block hash.
     *
     * Note: We use block hash instead of block number due to an Anvil bug where events are generated with L1 block numbers
     * instead of L2 block numbers when forking Arbitrum. By using the block hash, we can get the correct timestamp
     * even if the block number is incorrect.
     *
     * @param event - The event for which to fetch the timestamp.
     * @returns The timestamp of the block in which the event was included.
     */
    private async getEventTimestamp(event: Log): Promise<UnixTimestamp> {
        if (event.blockHash === null) {
            throw new InvalidBlockHashError();
        }
        const block = await this.l2ReadClient.getBlock({ blockHash: event.blockHash });
        return block.timestamp as UnixTimestamp;
    }

    /**
     * Fetches `ResponseProposed` events from the Oracle contract within a specified block range.
     *
     * @param {bigint} fromBlock - The starting block number to fetch events from.
     * @param {bigint} toBlock - The ending block number to fetch events up to.
     * @returns {Promise<EboEvent<"ResponseProposed">[]>} A promise that resolves to an array of `ResponseProposed` events.
     * @throws {Error} If event block number or log index is null.
     */
    private async getResponseProposedEvents(
        fromBlock: bigint,
        toBlock: bigint,
    ): Promise<EboEvent<"ResponseProposed">[]> {
        const events = await this.l2ReadClient.getContractEvents({
            address: this.oracleContract.address,
            abi: oracleAbi,
            eventName: "ResponseProposed",
            fromBlock,
            toBlock,
            strict: true,
        });

        const eventsWithTimestamps = await Promise.all(
            events.map(async (event) => {
                const { _requestId, _responseId, _response } = event.args;

                const timestamp = await this.getEventTimestamp(event);

                return {
                    name: "ResponseProposed",
                    blockNumber: event.blockNumber,
                    logIndex: event.logIndex,
                    timestamp: timestamp,
                    rawLog: event,

                    requestId: HexUtils.normalize(_requestId) as RequestId,
                    metadata: {
                        responseId: HexUtils.normalize(_responseId) as ResponseId,
                        requestId: HexUtils.normalize(_requestId) as RequestId,
                        response: {
                            proposer: _response.proposer,
                            requestId: HexUtils.normalize(_response.requestId) as RequestId,
                            response: _response.response,
                        },
                    },
                } as EboEvent<"ResponseProposed">;
            }),
        );
        return eventsWithTimestamps;
    }

    /**
     * Fetches `ResponseDisputed` events (emitted when a response is disputed) from the Oracle contract within a specified block range.
     *
     * @param {bigint} fromBlock - The starting block number to fetch events from.
     * @param {bigint} toBlock - The ending block number to fetch events up to.
     * @returns {Promise<EboEvent<"ResponseDisputed">[]>} A promise that resolves to an array of `ResponseDisputed` events.
     * @throws {Error} If event block number or log index is null.
     */
    private async getResponseDisputedEvents(
        fromBlock: bigint,
        toBlock: bigint,
    ): Promise<EboEvent<"ResponseDisputed">[]> {
        const events = await this.l2ReadClient.getContractEvents({
            address: this.oracleContract.address,
            abi: oracleAbi,
            eventName: "ResponseDisputed",
            fromBlock,
            toBlock,
            strict: true,
        });

        const eventsWithTimestamps = await Promise.all(
            events.map(async (event) => {
                const { _dispute, _responseId, _disputeId } = event.args;

                const timestamp = await this.getEventTimestamp(event);

                return {
                    name: "ResponseDisputed",
                    blockNumber: event.blockNumber,
                    logIndex: event.logIndex,
                    timestamp: timestamp,
                    rawLog: event,

                    requestId: HexUtils.normalize(_dispute.requestId) as RequestId,
                    metadata: {
                        responseId: HexUtils.normalize(_responseId) as ResponseId,
                        disputeId: HexUtils.normalize(_disputeId) as DisputeId,
                        dispute: {
                            disputer: _dispute.disputer,
                            proposer: _dispute.proposer,
                            responseId: HexUtils.normalize(_dispute.responseId) as ResponseId,
                            requestId: HexUtils.normalize(_dispute.requestId) as RequestId,
                        },
                    },
                } as EboEvent<"ResponseDisputed">;
            }),
        );
        return eventsWithTimestamps;
    }

    /**
     * Fetches `DisputeStatusUpdated` events (emitted when a dispute's status changes) from the Oracle contract within a specified block range.
     *
     * @param {bigint} fromBlock - The starting block number to fetch events from.
     * @param {bigint} toBlock - The ending block number to fetch events up to.
     * @returns {Promise<EboEvent<"DisputeStatusUpdated">[]>} A promise that resolves to an array of `DisputeStatusUpdated` events.
     * @throws {Error} If event block number or log index is null.
     */
    private async getDisputeStatusUpdatedEvents(
        fromBlock: bigint,
        toBlock: bigint,
    ): Promise<EboEvent<"DisputeStatusUpdated">[]> {
        const events = await this.l2ReadClient.getContractEvents({
            address: this.oracleContract.address,
            abi: oracleAbi,
            eventName: "DisputeStatusUpdated",
            fromBlock,
            toBlock,
            strict: true,
        });

        const eventsWithTimestamps = await Promise.all(
            events.map(async (event) => {
                const { _disputeId, _dispute, _status } = event.args;

                const timestamp = await this.getEventTimestamp(event);

                return {
                    name: "DisputeStatusUpdated",
                    blockNumber: event.blockNumber,
                    logIndex: event.logIndex,
                    timestamp: timestamp,
                    rawLog: event,

                    requestId: HexUtils.normalize(_dispute.requestId) as RequestId,
                    metadata: {
                        disputeId: HexUtils.normalize(_disputeId) as DisputeId,
                        dispute: {
                            disputer: _dispute.disputer,
                            proposer: _dispute.proposer,
                            responseId: HexUtils.normalize(_dispute.responseId) as ResponseId,
                            requestId: HexUtils.normalize(_dispute.requestId) as RequestId,
                        },
                        status: ProphetCodec.decodeDisputeStatus(_status),
                        blockNumber: event.blockNumber,
                    },
                } as EboEvent<"DisputeStatusUpdated">;
            }),
        );

        return eventsWithTimestamps;
    }

    /**
     * Fetches `DisputeEscalated` events from the Oracle contract within a specified block range.
     *
     * This method retrieves events related to the escalation of disputes, including the metadata for
     * each dispute such as the request ID, dispute details, and the caller's address.
     *
     * @param {bigint} fromBlock - The starting block number to fetch events from.
     * @param {bigint} toBlock - The ending block number to fetch events up to.
     * @returns {Promise<EboEvent<"DisputeEscalated">[]>} A promise that resolves to an array of `DisputeEscalated` events.
     * @throws {Error} If the event block number or log index is null.
     */
    private async getDisputeEscalatedEvents(
        fromBlock: bigint,
        toBlock: bigint,
    ): Promise<EboEvent<"DisputeEscalated">[]> {
        const events = await this.l2ReadClient.getContractEvents({
            address: this.oracleContract.address,
            abi: oracleAbi,
            eventName: "DisputeEscalated",
            fromBlock,
            toBlock,
            strict: true,
        });

        const eventsWithTimestamps = await Promise.all(
            events.map(async (event) => {
                const { _disputeId, _dispute, _caller } = event.args;

                const timestamp = await this.getEventTimestamp(event);

                return {
                    name: "DisputeEscalated",
                    blockNumber: event.blockNumber,
                    logIndex: event.logIndex,

                    timestamp: timestamp,
                    rawLog: event,

                    requestId: HexUtils.normalize(_dispute.requestId) as RequestId,
                    metadata: {
                        disputeId: HexUtils.normalize(_disputeId) as DisputeId,
                        dispute: {
                            disputer: _dispute.disputer,
                            proposer: _dispute.proposer,
                            responseId: HexUtils.normalize(_dispute.responseId) as ResponseId,
                            requestId: HexUtils.normalize(_dispute.requestId) as RequestId,
                        },
                        caller: _caller as Address,
                        blockNumber: event.blockNumber,
                    },
                } as EboEvent<"DisputeEscalated">;
            }),
        );

        return eventsWithTimestamps;
    }

    /**
     * Fetches `OracleRequestFinalized` events from the Oracle contract within a specified block range.
     *
     * @param {bigint} fromBlock - The starting block number to fetch events from.
     * @param {bigint} toBlock - The ending block number to fetch events up to.
     * @returns {Promise<EboEvent<"OracleRequestFinalized">[]>} A promise that resolves to an array of `OracleRequestFinalized` events.
     * @throws {Error} If event block number or log index is null.
     */
    private async getOracleRequestFinalizedEvents(
        fromBlock: bigint,
        toBlock: bigint,
    ): Promise<EboEvent<"OracleRequestFinalized">[]> {
        const events = await this.l2ReadClient.getContractEvents({
            address: this.oracleContract.address,
            abi: oracleAbi,
            eventName: "OracleRequestFinalized",
            fromBlock,
            toBlock,
            strict: true,
        });

        const eventsWithTimestamps = await Promise.all(
            events.map(async (event) => {
                const { _requestId, _responseId, _caller } = event.args;

                const timestamp = await this.getEventTimestamp(event);

                return {
                    name: "OracleRequestFinalized",
                    blockNumber: event.blockNumber,
                    logIndex: event.logIndex,
                    timestamp: timestamp,
                    rawLog: event,

                    requestId: HexUtils.normalize(_requestId) as RequestId,
                    metadata: {
                        requestId: HexUtils.normalize(_requestId) as RequestId,
                        responseId: HexUtils.normalize(_responseId) as ResponseId,
                        caller: _caller as Address,
                        blockNumber: event.blockNumber,
                    },
                } as EboEvent<"OracleRequestFinalized">;
            }),
        );

        return eventsWithTimestamps;
    }

    /**
     * Fetches all relevant events from the Oracle contract within a specified block range. Note that no specific order is enforced in the returned array.
     *
     * @param {bigint} fromBlock - The starting block number to fetch events from.
     * @param {bigint} toBlock - The ending block number to fetch events up to.
     * @returns {Promise<EboEvent<EboEventName>[]>} A promise that resolves to an array of Oracle events.
     */
    async getOracleEvents(fromBlock: bigint, toBlock: bigint) {
        const [
            requestCreatedEvents,
            responseProposedEvents,
            responseDisputedEvents,
            disputeStatusUpdatedEvents,
            disputeEscalatedEvents,
            oracleRequestFinalizedEvents,
        ] = await Promise.all([
            this.getOracleRequestCreatedEvents(fromBlock, toBlock),
            this.getResponseProposedEvents(fromBlock, toBlock),
            this.getResponseDisputedEvents(fromBlock, toBlock),
            this.getDisputeStatusUpdatedEvents(fromBlock, toBlock),
            this.getDisputeEscalatedEvents(fromBlock, toBlock),
            this.getOracleRequestFinalizedEvents(fromBlock, toBlock),
        ]);

        return [
            ...requestCreatedEvents,
            ...responseProposedEvents,
            ...responseDisputedEvents,
            ...disputeStatusUpdatedEvents,
            ...disputeEscalatedEvents,
            ...oracleRequestFinalizedEvents,
        ];
    }

    /**
     * Fetches `RequestCreated` events from the Oracle contract within a specified block range.
     *
     * @param {bigint} fromBlock - The starting block number to fetch events from.
     * @param {bigint} toBlock - The ending block number to fetch events up to.
     * @returns {Promise<EboEvent<"RequestCreated">[]>} A promise that resolves to an array of `RequestCreated` events.
     * @throws {Error} If event block number or log index is null.
     */
    private async getOracleRequestCreatedEvents(
        fromBlock: bigint,
        toBlock: bigint,
    ): Promise<EboEvent<"RequestCreated">[]> {
        const events = await this.l2ReadClient.getContractEvents({
            address: this.oracleContract.address,
            abi: oracleAbi,
            eventName: "RequestCreated",
            fromBlock,
            toBlock,
            strict: true,
        });

        /**
         * NOTE: This method retrieves all events and filters out only those originating from the
         * `EBORequestCreator` contract.
         *
         * Alternative Approach:
         * A more robust but complex solution would involve subscribing to the `RequestCreated` events
         * emitted by `EBORequestCreator` and subsequently querying the Oracle's `RequestCreated` events
         * using the corresponding request IDs. This approach ensures tighter event tracking but introduces
         * additional complexity.
         */
        const eventsWithTimestamps = await Promise.all(
            events
                .filter(
                    (event) =>
                        event.args._request.requester === this.eboRequestCreatorContract.address,
                )
                .map(async (event) => {
                    const timestamp = await this.getEventTimestamp(event);

                    return {
                        name: "RequestCreated" as const,
                        blockNumber: event.blockNumber,
                        logIndex: event.logIndex,
                        timestamp: timestamp,
                        rawLog: event,

                        requestId: HexUtils.normalize(event.args._requestId) as RequestId,
                        metadata: {
                            requestId: HexUtils.normalize(event.args._requestId) as RequestId,
                            request: event.args._request,
                            ipfsHash: event.args._ipfsHash,
                        },
                    } as EboEvent<"RequestCreated">;
                }),
        );

        return eventsWithTimestamps;
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
            throw new InvalidBlockRangeError(fromBlock, toBlock);
        }

        const oracleEvents = await this.getOracleEvents(fromBlock, toBlock);

        return this.mergeEventStreams(oracleEvents);
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
                if (a.blockNumber > b.blockNumber) return 1;
                if (a.blockNumber < b.blockNumber) return -1;

                if (a.logIndex > b.logIndex) return 1;
                if (a.logIndex < b.logIndex) return -1;

                return 0;
            });
    }

    // TODO: use Caip2 Chain ID instead of string in return type
    async getAvailableChains(): Promise<Caip2ChainId[]> {
        // TODO: implement actual method
        return ["eip155:421614"];
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
