import { ILogger, Timestamp } from "@ebo-agent/shared";
import axios, {
    AxiosInstance,
    AxiosResponse,
    InternalAxiosRequestConfig,
    isAxiosError,
} from "axios";
import { InvalidTokenError, jwtDecode } from "jwt-decode";

import { BlockmetaConnectionFailed } from "../exceptions/blockmetaConnectionFailed.js";
import { UndefinedBlockNumber } from "../exceptions/undefinedBlockNumber.js";
import { BlockNumberProvider } from "./blockNumberProvider.js";

type BlockByTimeResponse = {
    num: string;
    id: string;
    time: string;
};

export type BlockmetaClientConfig = {
    baseUrl: URL;
    servicePaths: {
        block: string;
        blockByTime: string;
    };
    bearerToken: string;
    bearerTokenExpirationWindow: number;
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
        private readonly clientConfig: BlockmetaClientConfig,
        private readonly logger: ILogger,
    ) {
        const { baseUrl, bearerToken } = clientConfig;

        this.axios = axios.create({
            baseURL: baseUrl.toString(),
            headers: {
                common: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${bearerToken}`,
                },
            },
        });

        this.axios.interceptors.request.use((config) => {
            return this.validateBearerToken(config);
        });
    }

    public static async initialize(
        config: BlockmetaClientConfig,
        logger: ILogger,
    ): Promise<BlockmetaJsonBlockNumberProvider> {
        const provider = new BlockmetaJsonBlockNumberProvider(config, logger);

        const connectedSuccessfully = await provider.testConnection();

        if (!connectedSuccessfully) throw new BlockmetaConnectionFailed();

        return provider;
    }

    async testConnection(): Promise<boolean> {
        const blockPath = this.clientConfig.servicePaths.block;

        try {
            await this.axios.post(`${blockPath}/Head`);

            return true;
        } catch (err) {
            if (isAxiosError(err)) return false;

            throw err;
        }
    }

    private validateBearerToken(requestConfig: InternalAxiosRequestConfig<any>) {
        const authorizationHeader = requestConfig.headers.Authorization?.toString();
        const matches = /^Bearer (.*)$/.exec(authorizationHeader || "");
        const token = matches ? matches[1] : undefined;

        try {
            const decodedToken = jwtDecode(token || "");
            const currentTime = Date.now();
            const expTime = decodedToken.exp;

            // No expiration time, token will be forever valid.
            if (!expTime) {
                this.logger.debug("JWT token being used has no expiration time.");

                return requestConfig;
            }

            const expirationWindow = this.clientConfig.bearerTokenExpirationWindow;

            if (currentTime + expirationWindow >= expTime) {
                const timeRemaining = expTime - currentTime;

                this.logger.warn(`Token will expire soon in ${timeRemaining}`);

                // TODO: notify
            }

            return requestConfig;
        } catch (err) {
            if (err instanceof InvalidTokenError) {
                this.logger.error("Invalid JWT token.");

                // TODO: notify
            }

            return requestConfig;
        }
    }

    /** @inheritdoc */
    async getEpochBlockNumber(timestamp: Timestamp): Promise<bigint> {
        if (timestamp > Number.MAX_SAFE_INTEGER || timestamp < 0)
            throw new RangeError(`Timestamp ${timestamp.toString()} cannot be casted to a Number.`);

        const timestampNumber = Number(timestamp);
        const isoTimestamp = new Date(timestampNumber).toISOString();

        try {
            // Try to get the block number at a specific timestamp
            const blockNumberAt = await this.getBlockNumberAt(isoTimestamp);

            return blockNumberAt;
        } catch (err) {
            const isAxios404 = isAxiosError(err) && err.response?.status === 404;
            const isUndefinedBlockNumber = !!(err instanceof UndefinedBlockNumber);

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
        const blockByTimePath = this.clientConfig.servicePaths.blockByTime;

        const response = await this.axios.post(`${blockByTimePath}/At`, { time: isoTimestamp });

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
        const blockByTimePath = this.clientConfig.servicePaths.blockByTime;

        const response = await this.axios.post(`${blockByTimePath}/Before`, { time: isoTimestamp });

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
