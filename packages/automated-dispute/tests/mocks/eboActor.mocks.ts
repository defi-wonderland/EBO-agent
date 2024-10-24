import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId, ILogger, UnixTimestamp } from "@ebo-agent/shared";
import { Mutex } from "async-mutex";
import { Block } from "viem";
import { vi } from "vitest";

import { ProtocolProvider } from "../../src/providers/index.js";
import {
    EboActor,
    EboMemoryRegistry,
    NotificationService,
    ProphetCodec,
} from "../../src/services/index.js";
import {
    Dispute,
    DisputeId,
    Request,
    Response,
    ResponseBody,
    ResponseId,
} from "../../src/types/index.js";
import {
    DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
    DEFAULT_MOCKED_REQUEST_CREATED_DATA,
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
    const { id } = request;
    const { chainId, epoch } = request.decodedData.requestModuleData;

    const protocolProvider = new ProtocolProvider(
        {
            l1: {
                chainId: "eip155:1",
                urls: ["http://localhost:8545"],
                retryInterval: 1,
                timeout: 100,
                transactionReceiptConfirmations: 1,
            },
            l2: {
                chainId: "eip155:42161",
                urls: ["http://localhost:8546"],
                retryInterval: 1,
                timeout: 100,
                transactionReceiptConfirmations: 1,
            },
        },
        DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
        mockedPrivateKey,
    );

    vi.spyOn(protocolProvider, "getCurrentEpoch").mockResolvedValue({
        number: BigInt(1),
        firstBlockNumber: BigInt(100),
        startTimestamp: BigInt(Date.now()) as UnixTimestamp,
    });
    vi.spyOn(protocolProvider, "proposeResponse").mockResolvedValue(undefined);
    vi.spyOn(protocolProvider, "disputeResponse").mockResolvedValue(undefined);
    vi.spyOn(protocolProvider, "getLastFinalizedBlock").mockResolvedValue({
        number: BigInt(1),
        timestamp: BigInt(Date.now()) as UnixTimestamp,
    } as unknown as Block<bigint, false, "finalized">);

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

    vi.spyOn(blockNumberService, "getEpochBlockNumber").mockResolvedValue(BigInt(12345));

    const registry = new EboMemoryRegistry();

    const eventProcessingMutex = new Mutex();

    let notificationService: NotificationService | undefined;

    if (!notificationService) {
        notificationService = {
            notifyError: vi.fn().mockResolvedValue(undefined),
        };
    }

    const actor = new EboActor(
        { id, epoch, chainId },
        protocolProvider,
        blockNumberService,
        registry,
        eventProcessingMutex,
        logger,
        notificationService,
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

export function buildRequest(
    attributes: Partial<Omit<Request, "decodedData">> = {},
    modulesData: Partial<Request["decodedData"]> = {},
): Request {
    const encodedProphetData: {
        -readonly [P in keyof Request["prophetData"]]: Request["prophetData"][P];
    } = { ...DEFAULT_MOCKED_REQUEST_CREATED_DATA["prophetData"] };

    if (modulesData.requestModuleData) {
        encodedProphetData["requestModuleData"] = ProphetCodec.encodeRequestRequestModuleData(
            modulesData.requestModuleData,
        );
    }

    if (modulesData.responseModuleData) {
        encodedProphetData["responseModuleData"] = ProphetCodec.encodeRequestResponseModuleData(
            modulesData.responseModuleData,
        );
    }

    if (modulesData.disputeModuleData) {
        encodedProphetData["disputeModuleData"] = ProphetCodec.encodeRequestDisputeModuleData(
            modulesData.disputeModuleData,
        );
    }

    return {
        ...DEFAULT_MOCKED_REQUEST_CREATED_DATA,
        prophetData: { ...encodedProphetData },
        ...attributes,
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
        block: 1n,
    };

    const baseResponse: Response = {
        id: "0x0111111111111111111111111111111111111111" as ResponseId,
        createdAt: {
            timestamp: (request.createdAt.timestamp + 1n) as UnixTimestamp,
            blockNumber: request.createdAt.blockNumber + 1n,
            logIndex: request.createdAt.logIndex + 1,
        },
        decodedData: {
            response: responseBody,
        },
        prophetData: {
            proposer: "0x0111111111111111111111111111111111111111",
            requestId: request.id,
            response: ProphetCodec.encodeResponse(responseBody),
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
        id: "0x01" as DisputeId,
        status: "Active",
        createdAt: {
            timestamp: (response.createdAt.timestamp + 1n) as UnixTimestamp,
            blockNumber: response.createdAt.blockNumber + 1n,
            logIndex: response.createdAt.logIndex + 1,
        },
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
