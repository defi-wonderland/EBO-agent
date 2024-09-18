import { inspect } from "util";
import { isNativeError } from "util/types";
import { EboActorsManager, EboProcessor, ProtocolProvider } from "@ebo-agent/automated-dispute";
import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Logger } from "@ebo-agent/shared";

import { config } from "./config/index.js";

const logger = Logger.getInstance();

const main = async (): Promise<void> => {
    const protocolProvider = new ProtocolProvider(
        config.protocolProvider.rpcsConfig,
        config.protocolProvider.contracts,
        config.protocolProvider.privateKey,
    );

    const blockNumberService = new BlockNumberService(
        config.blockNumberService.chainRpcUrls,
        config.blockNumberService.blockmetaConfig,
        logger,
    );

    const actorsManager = new EboActorsManager();

    const processor = new EboProcessor(protocolProvider, blockNumberService, actorsManager, logger);

    await processor.start(config.processor.msBetweenChecks);
};

process.on("unhandledRejection", (reason, p) => {
    logger.error(`Unhandled Rejection at: \n${inspect(p, undefined, 100)}, \nreason: ${reason}`);

    process.exit(1);
});

process.on("uncaughtException", (error: Error) => {
    logger.error(`An uncaught exception occurred: ${error}\n` + `Exception origin: ${error.stack}`);

    process.exit(1);
});

main().catch((err) => {
    logger.error(`Main handler failure.`);

    if (isNativeError(err)) {
        logger.error(`${err.stack}`);
        logger.error(`${err.message}`);
    } else {
        logger.error(err);
    }

    process.exit(1);
});
