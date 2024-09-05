import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types";
import { ILogger } from "@ebo-agent/shared";

import { EboActorsManager } from "../../src/eboActorsManager";
import { ProtocolProvider } from "../../src/protocolProvider";
import { EboProcessor } from "../../src/services";
import { DEFAULT_MOCKED_PROTOCOL_CONTRACTS, mockedPrivateKey } from "../eboActor/fixtures";

export function buildEboProcessor(logger: ILogger) {
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
    const processor = new EboProcessor(protocolProvider, blockNumberService, actorsManager, logger);

    return {
        processor,
        protocolProvider,
        blockNumberService,
        actorsManager,
        logger,
    };
}
