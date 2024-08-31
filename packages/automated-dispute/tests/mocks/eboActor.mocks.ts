import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types";
import { ILogger } from "@ebo-agent/shared";
import { Mutex } from "async-mutex";

import { EboActor } from "../../src/eboActor.js";
import { ProtocolProvider } from "../../src/protocolProvider.js";
import { EboMemoryRegistry } from "../../src/services/index.js";
import { Dispute, Request, Response } from "../../src/types/index.js";
import { DEFAULT_MOCKED_PROTOCOL_CONTRACTS } from "../eboActor/fixtures.js";

/**
 * Builds a base `EboActor` scaffolded with all its dependencies.
 *
 * @param request a `Request` to populate the `EboActor` with
 * @param logger logger
 * @returns
 */
export function buildEboActor(request: Request, logger: ILogger) {
    const { id, chainId, epoch } = request;

    const protocolProviderRpcUrls = ["http://localhost:8538"];
    const protocolProvider = new ProtocolProvider(
        protocolProviderRpcUrls,
        DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
    );

    const blockNumberRpcUrls = new Map<Caip2ChainId, string[]>([
        [chainId, ["http://localhost:8539"]],
    ]);
    const blockNumberService = new BlockNumberService(blockNumberRpcUrls, logger);

    const registry = new EboMemoryRegistry();

    const eventProcessingMutex = new Mutex();

    const actor = new EboActor(
        { id, epoch },
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
    const baseResponse: Response = {
        id: "0x01",
        wasDisputed: false,
        prophetData: {
            proposer: "0x01",
            requestId: request.id,
            response: {
                chainId: request.chainId,
                block: 1n,
                epoch: request.epoch,
            },
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
