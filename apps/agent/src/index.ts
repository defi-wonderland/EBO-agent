import { inspect } from "util";
import { EboActorsManager, EboProcessor } from "@ebo-agent/automated-dispute";
import { ProtocolProvider } from "@ebo-agent/automated-dispute/dist/providers/protocolProvider.js";
import { DiscordNotifier } from "@ebo-agent/automated-dispute/src/services/index.js";
import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Logger } from "@ebo-agent/shared";

// TODO: use env vars and validate config schema
const config = {
    protocolProvider: {
        rpcUrls: ["localhost"],
        contracts: {
            oracle: "0x00",
            epochManager: "0x00",
            eboRequestCreator: "0x00",
        } as const,
        privateKey: "0xsecret" as const,
    },
    blockNumberService: {
        chainRpcUrls: new Map([["eip155:1" as const, ["localhost"]]]),
        blockmetaConfig: {
            baseUrl: new URL("localhost:443"),
            servicePaths: {
                blockByTime: "/sf.blockmeta.v2.BlockByTime",
                block: "/sf.blockmeta.v2.Block",
            },
            bearerToken: "secret-token",
            bearerTokenExpirationWindow: 365 * 24 * 60 * 60 * 1000, // 1 year
        },
    },
    processor: {
        msBetweenChecks: 1,
    },
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || "",
    DISCORD_CHANNEL_ID: process.env.DISCORD_CHANNEL_ID || "",
};

const logger = Logger.getInstance();

const main = async (): Promise<void> => {
    const protocolProvider = new ProtocolProvider(
        config.protocolProvider.rpcUrls,
        config.protocolProvider.contracts,
        config.protocolProvider.privateKey,
    );

    const blockNumberService = new BlockNumberService(
        config.blockNumberService.chainRpcUrls,
        config.blockNumberService.blockmetaConfig,
        logger,
    );

    const actorsManager = new EboActorsManager();

    const notifier = await DiscordNotifier.create({
        discordBotToken: config.DISCORD_BOT_TOKEN,
        discordChannelId: config.DISCORD_CHANNEL_ID,
    });

    const processor = new EboProcessor(
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
    logger.error(`Error in main handler: ${err}`);

    process.exit(1);
});
