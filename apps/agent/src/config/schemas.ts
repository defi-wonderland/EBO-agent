import { Caip2Utils } from "@ebo-agent/blocknumber";
import { isAddress, isHex } from "viem";
import { z } from "zod";

// TODO: test schemas

export const envSchema = z.object({
    PROTOCOL_PROVIDER_PRIVATE_KEY: z.string().refine((key) => isHex(key)),
    BLOCK_NUMBER_SERVICE_BEARER_TOKEN: z.string(),
    EBO_AGENT_CONFIG_FILE_PATH: z.string(),
});

const addressSchema = z.string().refine((address) => isAddress(address));
const chainIdSchema = z.string().refine((id) => Caip2Utils.validateChainId(id));

const protocolProviderConfigSchema = z.object({
    rpcsConfig: z.object({
        urls: z.array(z.string().url()),
        transactionReceiptConfirmations: z.number().int().positive(),
        timeout: z.number().int().positive(),
        retryInterval: z.number().int().positive(),
    }),
    contracts: z.object({
        oracle: addressSchema,
        epochManager: addressSchema,
        eboRequestCreator: addressSchema,
    }),
});

const chainRpcUrlSchema = z.object({
    chainId: chainIdSchema,
    urls: z.array(z.string().url()),
});

const blockNumberServiceSchema = z.object({
    chainRpcUrls: z
        .array(chainRpcUrlSchema)
        .transform((arr) => new Map(arr.map(({ chainId, urls }) => [chainId, urls]))),
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
});

export const eboAgentConfigSchema = z.object({
    protocolProvider: protocolProviderConfigSchema,
    blockNumberService: blockNumberServiceSchema,
    processor: processorSchema,
});
