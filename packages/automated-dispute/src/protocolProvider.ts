import {
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

import { epochManagerAbi, oracleAbi } from "./abis/index.js";
import { RpcUrlsEmpty } from "./exceptions/rpcUrlsEmpty.exception.js";
import { ProtocolContractsAddresses } from "./types/protocolProvider.js";

export class ProtocolProvider {
    private client: PublicClient<FallbackTransport<HttpTransport[]>>;
    private oracleContract: GetContractReturnType<
        typeof oracleAbi,
        typeof this.client,
        `0x${string}`
    >;
    private epochManagerContract: GetContractReturnType<
        typeof epochManagerAbi,
        typeof this.client,
        `0x${string}`
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

    // createRequest(chains[]);
    // getEvents(fromBlock,toBlock): Queue;
    // hasStakedAssets(address):boolean;
    // getAvailableChains(args): CAIP2[];
    // proposeResponse(args): void;
    // dispute(args): void;
    // pledgeForDispute(args): void;
    // pledgeAgaintsDispute(args): void;
    // releasePledge(args):void;
    // finalize(args): void;
}
