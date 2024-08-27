import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { Timestamp } from "@ebo-agent/shared";
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

import type { EboEvent, EboEventName } from "./types/events.js";
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

        const currentEpochBlock = await this.client.getBlock({
            blockNumber: currentEpochBlockNumber,
        });

        return {
            currentEpoch,
            currentEpochBlockNumber,
            currentEpochTimestamp: currentEpochBlock.timestamp,
        };
    }

    async getLastFinalizedBlock(): Promise<bigint> {
        const { number } = await this.client.getBlock({ blockTag: "finalized" });

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
            {
                name: "DisputeStatusChanged",
                blockNumber: 4n,
                logIndex: 20,
                requestId: "0x01",
                metadata: { disputeId: "0x03", status: "Won", blockNumber: 4n },
            } as EboEvent<"DisputeStatusChanged">,
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
    async createRequest(_epoch: bigint, _chains: string[]): Promise<void> {
        // TODO: implement actual method

        return;
    }

    async proposeResponse(
        _requestId: string,
        _epoch: bigint,
        _chainId: Caip2ChainId,
        _blockNumber: bigint,
    ): Promise<void> {
        // TODO: implement actual method
        return;
    }

    async disputeResponse(
        _requestId: string,
        _responseId: string,
        _proposer: Address,
    ): Promise<void> {
        // TODO: implement actual method
        return;
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

    async escalateDispute(
        _request: Request["prophetData"],
        _response: Response["prophetData"],
        _dispute: Dispute["prophetData"],
    ): Promise<void> {
        // TODO: implement actual method
        return;
    }

    // Pending confirmation from onchain team
    // releasePledge(args):void;

    async finalize(
        _request: Request["prophetData"],
        _response: Response["prophetData"],
    ): Promise<void> {
        //TODO: implement actual method
        return;
    }
}
