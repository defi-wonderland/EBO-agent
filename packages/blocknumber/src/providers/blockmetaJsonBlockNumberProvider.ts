import { ILogger, Timestamp } from "@ebo-agent/shared";
import axios, { AxiosInstance, AxiosResponse, isAxiosError } from "axios";

import { UndefinedBlockNumber } from "../exceptions/undefinedBlockNumber.js";
import { BlockNumberProvider } from "./blockNumberProvider.js";

type BlockByTimeResponse = {
    num: string;
    id: string;
    time: string;
};

export type BlockmetaClientConfig = {
    baseUrl: URL;
    servicePath: string;
    bearerToken: string;
};

/**
 * Consumes the blockmeta.BlockByTime substreams' service via HTTP POST JSON requests to provide
 * block numbers based on timestamps
 *
 * Refer to these web pages for more information:
 * * https://thegraph.market/
 * * https://substreams.streamingfast.io/documentation/consume/authentication
 */
export class BlockmetaJsonBlockNumberProvider implements BlockNumberProvider {
    private readonly axios: AxiosInstance;

    constructor(
        private readonly options: BlockmetaClientConfig,
        private readonly logger: ILogger,
    ) {
        const { baseUrl, bearerToken } = options;

        this.axios = axios.create({
            baseURL: baseUrl.toString(),
            headers: {
                common: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${bearerToken}`,
                },
            },
        });
    }

    /** @inheritdoc */
    async getEpochBlockNumber(timestamp: Timestamp): Promise<bigint> {
        if (timestamp > Number.MAX_SAFE_INTEGER || timestamp < Number.MIN_SAFE_INTEGER)
            throw new RangeError(`Timestamp ${timestamp.toString()} cannot be casted to a Number.`);

        const timestampNumber = Number(timestamp);
        const isoTimestamp = new Date(timestampNumber).toISOString();

        try {
            // Try to get the block number at a specific timestamp
            const blockNumberAt = await this.getBlockNumberAt(isoTimestamp);

            return blockNumberAt;
        } catch (err) {
            const isAxios404 = isAxiosError(err) && err.response?.status === 404;
            const isUndefinedBlockNumber = err instanceof UndefinedBlockNumber;

            if (!isAxios404 && !isUndefinedBlockNumber) throw err;

            // If no block has its timestamp exactly equal to the specified timestamp,
            // try to get the most recent block before the specified timestamp.
            const blockNumberBefore = await this.getBlockNumberBefore(isoTimestamp);

            return blockNumberBefore;
        }
    }

    /**
     * Gets the block number at a specific timestamp.
     *
     * @param isoTimestamp ISO UTC timestamp
     * @throws { UndefinedBlockNumber } if request was successful but block number is invalid/not present
     * @throws { AxiosError } if request fails
     * @returns a promise with the block number at the timestamp
     */
    private async getBlockNumberAt(isoTimestamp: string): Promise<bigint> {
        const { servicePath } = this.options;

        const response = await this.axios.post(`${servicePath}/At`, { time: isoTimestamp });

        return this.parseBlockByTimeResponse(response, isoTimestamp);
    }

    /**
     * Gets the most recent block number before the specified timestamp.
     *
     * @param isoTimestamp ISO UTC timestamp
     * @throws { UndefinedBlockNumber } if request was successful but block number is invalid/not present
     * @throws { AxiosError } if request fails
     * @returns a promise with the most recent block number before the specified timestamp
     */
    private async getBlockNumberBefore(isoTimestamp: string): Promise<bigint> {
        const { servicePath } = this.options;

        const response = await this.axios.post(`${servicePath}/Before`, { time: isoTimestamp });

        return this.parseBlockByTimeResponse(response, isoTimestamp);
    }

    /**
     * Parse the BlockByTime response and extracts the block number.
     *
     * @param response an AxiosResponse of a request to BlockByTime endpoint
     * @param isoTimestamp the timestamp that was sent in the request
     * @returns the block number inside a BlockByTime service response
     */
    private parseBlockByTimeResponse(response: AxiosResponse, isoTimestamp: string): bigint {
        const { data } = response;
        // TODO: validate with zod instead
        const blockNumber = (data as BlockByTimeResponse)["num"];

        if (blockNumber === undefined) {
            this.logger.error(`Couldn't find a block number for timestamp ${isoTimestamp}`);

            throw new UndefinedBlockNumber(isoTimestamp);
        }

        return BigInt(blockNumber);
    }
}
