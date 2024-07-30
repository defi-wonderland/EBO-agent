import {
    Address,
    createPublicClient,
    fallback,
    FallbackTransport,
    getContract,
    GetContractReturnType,
    http,
    HttpTransport,
    PublicClient,
} from "viem";
import { arbitrum } from "viem/chains";

import type {
    DisputeStatusChanged,
    EboEvent,
    RequestCreated,
    ResponseDisputed,
    ResponseProposed,
} from "./types/events.js";
import type { Dispute, Request, Response } from "./types/prophet.js";
import { epochManagerAbi, oracleAbi } from "./abis/index.js";
import { RpcUrlsEmpty } from "./exceptions/rpcUrlsEmpty.exception.js";
import { ProtocolContractsAddresses } from "./types/protocolProvider.js";

export class ProtocolProvider {
    private client: PublicClient<FallbackTransport<HttpTransport[]>>;
    private oracleContract: GetContractReturnType<typeof oracleAbi, typeof this.client, Address>;
    private epochManagerContract: GetContractReturnType<
        typeof epochManagerAbi,
        typeof this.client,
        Address
    >;

    /**
     * Creates a new ProtocolProvider instance
     * @param rpcUrls The RPC URLs to connect to the Arbitrum chain
     * @param contracts The addresses of the protocol contracts that will be instantiated
     */
    constructor(rpcUrls: string[], contracts: ProtocolContractsAddresses) {
        if (rpcUrls.length === 0) {
            throw new RpcUrlsEmpty();
        }
        this.client = createPublicClient({
            chain: arbitrum,
            transport: fallback(rpcUrls.map((url) => http(url))),
        });
        // Instantiate all the protocol contracts
        this.oracleContract = getContract({
            address: contracts.oracle,
            abi: oracleAbi,
            client: this.client,
        });
        this.epochManagerContract = getContract({
            address: contracts.epochManager,
            abi: epochManagerAbi,
            client: this.client,
        });
    }

    /**
     * Gets the current epoch and the block number of the current epoch
     * @returns The current epoch and the block number of the current epoch
     */
    async getCurrentEpoch(): Promise<{ currentEpoch: bigint; currentEpochBlock: bigint }> {
        const [currentEpoch, currentEpochBlock] = await Promise.all([
            this.epochManagerContract.read.currentEpoch(),
            this.epochManagerContract.read.currentEpochBlock(),
        ]);
        return {
            currentEpoch,
            currentEpochBlock,
        };
    }

    async getEvents(_fromBlock: bigint, _toBlock: bigint): Promise<EboEvent[]> {
        // TODO: implement actual method.
        //
        // We should decode events using the corresponding ABI and also "fabricate" new events
        // if for some triggers there are no events (e.g. dispute window ended)
        const eboRequestCreatorEvents = [
            {
                name: "RequestCreated",
                blockNumber: 1n,
                logIndex: 1,
                metadata: {
                    requestId: "0x01",
                    request: {
                        requester: "0x12345678901234567890123456789012",
                        requestModule: "0x12345678901234567890123456789012",
                        responseModule: "0x12345678901234567890123456789012",
                        disputeModule: "0x12345678901234567890123456789012",
                        resolutionModule: "0x12345678901234567890123456789012",
                        finalityModule: "0x12345678901234567890123456789012",
                    },
                },
            } as RequestCreated,
        ];

        const oracleEvents = [
            {
                name: "ResponseProposed",
                blockNumber: 2n,
                logIndex: 1,
                metadata: {
                    requestId: "0x01",
                    responseId: "0x02",
                    response: {
                        proposer: "0x12345678901234567890123456789012",
                        requestId: "0x01",
                        response: "0x01234",
                    },
                },
            } as ResponseProposed,
            {
                name: "ResponseDisputed",
                blockNumber: 3n,
                logIndex: 1,
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
            } as ResponseDisputed,
            {
                name: "DisputeStatusChanged",
                blockNumber: 4n,
                logIndex: 20,
                metadata: { disputeId: "0x03", status: "Won", blockNumber: 4n },
            } as DisputeStatusChanged,
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
    private mergeEventStreams(...streams: EboEvent[][]) {
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
    async createRequest(_epoch: bigint, _chains: string[]): Promise<void> {
        // TODO: implement actual method

        return;
    }

    async proposeResponse(_request: Request, _response: Response): Promise<void> {
        // TODO: implement actual method
        return;
    }

    async disputeResponse(
        _request: Request,
        _response: Response,
        _dispute: Dispute,
    ): Promise<void> {
        // TODO: implement actual method
        return;
    }

    async pledgeForDispute(_request: Request, _dispute: Dispute): Promise<void> {
        // TODO: implement actual method
        return;
    }

    async pledgeAgaintsDispute(_request: Request, _dispute: Dispute): Promise<void> {
        // TODO: implement actual method
        return;
    }

    // Pending confirmation from onchain team
    // releasePledge(args):void;

    async finalize(_request: Request, _response: Response): Promise<void> {
        //TODO: implement actual method
        return;
    }
}