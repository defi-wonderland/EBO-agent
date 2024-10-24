import { BlockNumberService, Caip2ChainId } from "@ebo-agent/blocknumber";
import { ILogger } from "@ebo-agent/shared";
import { vi } from "vitest";

import { ProtocolProvider } from "../../src/providers/index.js";
import { EboProcessor, NotificationService } from "../../src/services";
import { EboActorsManager } from "../../src/services/index.js";
import { AccountingModules } from "../../src/types/prophet.js";
import {
    DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
    mockedPrivateKey,
} from "../services/eboActor/fixtures.js";

export function buildEboProcessor(
    logger: ILogger,
    accountingModules: AccountingModules = {
        requestModule: "0x01",
        responseModule: "0x02",
        escalationModule: "0x03",
    },
    notifier?: NotificationService,
) {
    const protocolProvider = new ProtocolProvider(
        {
            l1: {
                chainId: "eip155:1",
                urls: ["http://localhost:8538"],
                retryInterval: 1,
                timeout: 100,
                transactionReceiptConfirmations: 1,
            },
            l2: {
                chainId: "eip155:42161",
                urls: ["http://localhost:8539"],
                retryInterval: 1,
                timeout: 100,
                transactionReceiptConfirmations: 1,
            },
        },
        DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
        mockedPrivateKey,
    );

    const blockNumberRpcUrls = new Map<Caip2ChainId, string[]>([
        ["eip155:1" as Caip2ChainId, ["http://localhost:8539"]],
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

    const actorsManager = new EboActorsManager();

    if (!notifier) {
        notifier = {
            notifyError: vi.fn().mockResolvedValue(undefined),
        };
    }

    const processor = new EboProcessor(
        accountingModules,
        protocolProvider,
        blockNumberService,
        actorsManager,
        logger,
        notifier,
    );

    return {
        processor,
        protocolProvider,
        blockNumberService,
        actorsManager,
        logger,
        notifier,
    };
}
