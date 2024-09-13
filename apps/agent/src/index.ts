import { inspect } from "util";
import { EboActorsManager, EboProcessor } from "@ebo-agent/automated-dispute";
import { ProtocolProvider } from "@ebo-agent/automated-dispute/dist/providers/protocolProvider.js";
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
    },
    processor: {
        msBetweenChecks: 1,
    },
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
        logger,
    );

    const actorsManager = new EboActorsManager();

    const processor = new EboProcessor(protocolProvider, blockNumberService, actorsManager, logger);

    await processor.start(config.processor.msBetweenChecks);
};

process.on("unhandledRejection", (reason, p) => {
    console.error(`Unhandled Rejection at: \n${inspect(p, undefined, 100)}, \nreason: ${reason}`);

    process.exit(1);
});

process.on("uncaughtException", (error: Error) => {
    console.error(
        `An uncaught exception occurred: ${error}\n` + `Exception origin: ${error.stack}`,
    );

    process.exit(1);
});

main().catch((err) => {
    logger.error(`Error in main handler: ${err}`);

    process.exit(1);
});
