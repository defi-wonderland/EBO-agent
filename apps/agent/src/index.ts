import { inspect } from "util";
import { isNativeError } from "util/types";
import {
    DiscordNotifier,
    EboActorsManager,
    EboProcessor,
    ProtocolProvider,
} from "@ebo-agent/automated-dispute";
import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Logger } from "@ebo-agent/shared";

import { config } from "./config/index.js";

const logger = Logger.getInstance();

const main = async (): Promise<void> => {
    const blockNumberService = new BlockNumberService(
        config.blockNumberService.chainRpcUrls,
        config.blockNumberService.blockmetaConfig,
        logger,
    );

    const protocolProvider = new ProtocolProvider(
        config.protocolProvider.rpcsConfig,
        config.protocolProvider.contracts,
        config.protocolProvider.privateKey,
        blockNumberService,
    );

    const actorsManager = new EboActorsManager();

    const notifier = await DiscordNotifier.create(
        {
            discordBotToken: config.DISCORD_BOT_TOKEN,
            discordChannelId: config.DISCORD_CHANNEL_ID,
        },
        logger,
    );

    const processor = new EboProcessor(
        config.processor.accountingModules,
        protocolProvider,
        blockNumberService,
        actorsManager,
        logger,
        notifier,
    );

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
