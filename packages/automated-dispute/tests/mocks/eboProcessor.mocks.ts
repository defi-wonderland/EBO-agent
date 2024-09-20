import { BlockNumberService, Caip2ChainId } from "@ebo-agent/blocknumber";
import { ILogger } from "@ebo-agent/shared";

import { ProtocolProvider } from "../../src/providers/index.js";
import { EboProcessor } from "../../src/services";
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
) {
    const protocolProviderRpcUrls = ["http://localhost:8538"];
    const protocolProvider = new ProtocolProvider(
        protocolProviderRpcUrls,
        DEFAULT_MOCKED_PROTOCOL_CONTRACTS,
        mockedPrivateKey,
    );

    const blockNumberRpcUrls = new Map<Caip2ChainId, string[]>([
        ["eip155:1" as Caip2ChainId, ["http://localhost:8539"]],
    ]);
    const blockNumberService = new BlockNumberService(blockNumberRpcUrls, logger);

    const actorsManager = new EboActorsManager();

    const processor = new EboProcessor(
        accountingModules,
        protocolProvider,
        blockNumberService,
        actorsManager,
        logger,
    );

    return {
        processor,
        protocolProvider,
        blockNumberService,
        actorsManager,
        logger,
    };
}
