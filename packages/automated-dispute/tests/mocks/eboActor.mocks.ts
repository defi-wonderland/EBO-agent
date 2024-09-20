import { BlockNumberService, Caip2ChainId } from "@ebo-agent/blocknumber";
import { ILogger } from "@ebo-agent/shared";
import { Mutex } from "async-mutex";

import { ProtocolProvider } from "../../src/providers/index.js";
import { EboActor, EboMemoryRegistry } from "../../src/services/index.js";
import { Dispute, Request, Response, ResponseBody } from "../../src/types/index.js";
import {
    DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
    mockedPrivateKey,
} from "../services/eboActor/fixtures.js";

/**
 * Builds a base `EboActor` scaffolded with all its dependencies.
 *
 * @param request a `Request` to populate the `EboActor` with
 * @param logger logger
 * @returns
 */
export function buildEboActor(request: Request, logger: ILogger) {
    const { id, chainId, epoch } = request;

    const protocolProvider = new ProtocolProvider(
        {
            urls: ["http://localhost:8545"],
            retryInterval: 1,
            timeout: 100,
            transactionReceiptConfirmations: 1,
        },
        DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
        mockedPrivateKey,
    );

    const blockNumberRpcUrls = new Map<Caip2ChainId, string[]>([
        [chainId, ["http://localhost:8539"]],
    ]);
    const blockNumberService = new BlockNumberService(
        blockNumberRpcUrls,
        {
            baseUrl: new URL("http://localhost"),
            bearerToken: "secret-token",
            bearerTokenExpirationWindow: 10,
            servicePaths: {
                block: "/block",
                blockByTime: "/blockbytime",
            },
        },
        logger,
    );

    const registry = new EboMemoryRegistry();

    const eventProcessingMutex = new Mutex();

    const actor = new EboActor(
        { id, epoch, chainId },
        protocolProvider,
        blockNumberService,
        registry,
        eventProcessingMutex,
        logger,
    );

    return {
        actor,
        protocolProvider,
        blockNumberService,
        registry,
        eventProcessingMutex,
        logger,
    };
}

/**
 * Helper function to build a response based on a request.
 *
 * @param request the `Request` to base the response on
 * @param attributes custom attributes to set into the response to build
 * @returns a `Response`
 */
export function buildResponse(request: Request, attributes: Partial<Response> = {}): Response {
    const responseBody: ResponseBody = {
        chainId: request.chainId,
        block: 1n,
        epoch: request.epoch,
    };

    const baseResponse: Response = {
        id: "0x01",
        createdAt: request.createdAt + 1n,
        decodedData: {
            response: responseBody,
        },
        prophetData: {
            proposer: "0x01",
            requestId: request.id,
            response: ProtocolProvider.encodeResponse(responseBody),
        },
    };

    return {
        ...baseResponse,
        ...attributes,
    };
}

export function buildDispute(
    request: Request,
    response: Response,
    attributes: Partial<Dispute> = {},
): Dispute {
    const baseDispute: Dispute = {
        id: "0x01",
        status: "Active",
        createdAt: response.createdAt + 1n,
        prophetData: {
            disputer: "0x01",
            proposer: response.prophetData.proposer,
            requestId: request.id,
            responseId: response.id,
        },
    };

    return {
        ...baseDispute,
        ...attributes,
    };
}
