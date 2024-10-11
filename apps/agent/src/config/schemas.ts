import { Caip2ChainId, Caip2Utils } from "@ebo-agent/blocknumber/src/index.js";
import { isAddress, isHex } from "viem";
import { z } from "zod";

// TODO: test schemas

const stringToJSONSchema = z.string().transform((str, ctx): z.infer<ReturnType<typeof Object>> => {
    try {
        return JSON.parse(str);
    } catch (e) {
        ctx.addIssue({ code: "custom", message: "Invalid JSON" });
        return z.NEVER;
    }
});

const chainIdSchema = z.string().refine((id) => Caip2Utils.validateChainId(id));
const chainRpcUrlSchema = z
    .record(chainIdSchema, z.array(z.string().url()))
    .transform((records) => new Map(Object.entries(records) as [Caip2ChainId, string[]][]));

const rpcUrlsSchema = z
    .string()
    .transform((str) => str.split(","))
    .refine((arr) => arr.every((url) => z.string().url().safeParse(url).success));

export const envSchema = z.object({
    PROTOCOL_PROVIDER_PRIVATE_KEY: z.string().refine((key) => isHex(key)),
    PROTOCOL_PROVIDER_L1_RPC_URLS: rpcUrlsSchema,
    PROTOCOL_PROVIDER_L2_RPC_URLS: rpcUrlsSchema,
    BLOCK_NUMBER_RPC_URLS_MAP: stringToJSONSchema.pipe(chainRpcUrlSchema),
    BLOCK_NUMBER_BLOCKMETA_TOKEN: z.string(),
    EBO_AGENT_CONFIG_FILE_PATH: z.string(),
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_CHANNEL_ID: z.string(),
});

const addressSchema = z.string().refine((address) => isAddress(address));
const rpcConfigSchema = z.object({
    transactionReceiptConfirmations: z.number().int().positive(),
    timeout: z.number().int().positive(),
    retryInterval: z.number().int().positive(),
});

const protocolProviderConfigSchema = z.object({
    rpcsConfig: z.object({
        l1: rpcConfigSchema,
        l2: rpcConfigSchema,
    }),
    contracts: z.object({
        oracle: addressSchema,
        epochManager: addressSchema,
        eboRequestCreator: addressSchema,
        bondEscalationModule: addressSchema,
        horizonAccountingExtension: addressSchema,
    }),
});

const blockNumberServiceSchema = z.object({
    blockmetaConfig: z.object({
        baseUrl: z
            .string()
            .url()
            .transform((url) => new URL(url)),
        servicePaths: z.object({
            blockByTime: z.string(),
            block: z.string(),
        }),
        bearerTokenExpirationWindow: z.number().int().positive(),
    }),
});

const processorSchema = z.object({
    msBetweenChecks: z.number().int().positive(),
    accountingModules: z.object({
        requestModule: addressSchema,
        responseModule: addressSchema,
        escalationModule: addressSchema,
    }),
});

export const eboAgentConfigSchema = z.object({
    protocolProvider: protocolProviderConfigSchema,
    blockNumberService: blockNumberServiceSchema,
    processor: processorSchema,
});
