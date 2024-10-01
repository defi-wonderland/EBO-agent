import fs from "fs";
import { isNativeError } from "util/types";
import { Logger } from "@ebo-agent/shared";
import dotenv from "dotenv";
import yaml from "yaml";

import { eboAgentConfigSchema, envSchema } from "./schemas.js";

const logger = Logger.getInstance();

dotenv.config();

const env = envSchema.safeParse(process.env);

if (!env.success) {
    logger.error("Invalid environment variables:");
    logger.error(env.error.issues.map((issue) => JSON.stringify(issue)).join("\n"));

    process.exit(1);
}

let configFile: string;
let configContent: unknown;

try {
    configFile = fs.readFileSync(env.data.EBO_AGENT_CONFIG_FILE_PATH, "utf-8");
    configContent = yaml.parse(configFile);
} catch (err) {
    logger.error(`Failed to read config file at ${env.data.EBO_AGENT_CONFIG_FILE_PATH}.`);
    logger.error(`${isNativeError(err) ? err.message : err}`);

    process.exit(1);
}

const parsedConfig = eboAgentConfigSchema.safeParse(configContent);

if (!parsedConfig.success) {
    logger.error("Invalid config file:");
    logger.error(parsedConfig.error.issues.map((issue) => JSON.stringify(issue)).join("\n"));

    process.exit(1);
}

const { data: envData } = env;
const { data: configData } = parsedConfig;

export const config = {
    protocolProvider: {
        ...configData.protocolProvider,
        rpcsConfig: {
            ...configData.protocolProvider.rpcsConfig,
            urls: envData.PROTOCOL_PROVIDER_RPC_URLS,
        },
        privateKey: envData.PROTOCOL_PROVIDER_PRIVATE_KEY,
    },
    blockNumberService: {
        chainRpcUrls: envData.BLOCK_NUMBER_RPC_URLS_MAP,
        blockmetaConfig: {
            ...configData.blockNumberService.blockmetaConfig,
            bearerToken: envData.BLOCK_NUMBER_BLOCKMETA_TOKEN,
        },
    },
    processor: { ...configData.processor },
    DISCORD_BOT_TOKEN: envData.DISCORD_BOT_TOKEN || "",
    DISCORD_CHANNEL_ID: envData.DISCORD_CHANNEL_ID || "",
} as const;
