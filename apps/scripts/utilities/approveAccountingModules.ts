import { ProtocolProvider } from "@ebo-agent/automated-dispute/src/index.js";
import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/shared";
import * as dotenv from "dotenv";
import { Address, Hex, isHex } from "viem";
import { z } from "zod";

dotenv.config();

/**
 * Defines a Zod schema for JSON strings to enforce stronger typing.
 */
const stringToJSONSchema = z.string().transform((str, ctx): Record<string, unknown> => {
    try {
        return JSON.parse(str);
    } catch (e) {
        ctx.addIssue({ code: "custom", message: "Invalid JSON" });
        return z.NEVER;
    }
});

/**
 * Defines a schema for a valid Hex string.
 */
const hexSchema = z.string().refine((val): val is Hex => isHex(val), {
    message: "Must be a valid Hex string",
});

/**
 * Defines the schema for CONTRACTS_ADDRESSES based on expected structure.
 */
const contractsAddressesSchema = z.object({
    l1ChainId: z.string().refine((val): val is Caip2ChainId => val.includes(":"), {
        message: "l1ChainId must be in the format 'namespace:chainId' (e.g., 'eip155:1')",
    }),
    l2ChainId: z.string().refine((val): val is Caip2ChainId => val.includes(":"), {
        message: "l2ChainId must be in the format 'namespace:chainId' (e.g., 'eip155:42161')",
    }),
    oracle: hexSchema,
    epochManager: hexSchema,
    bondEscalationModule: hexSchema,
    horizonAccountingExtension: hexSchema
        .optional()
        .default("0x0000000000000000000000000000000000000000"),
    // Default to a zero address because it's not required for the script but required for ProtocolProvider
    eboRequestCreator: hexSchema.optional().default("0x0000000000000000000000000000000000000000"),
});

/**
 * Defines and validates environment variables using Zod.
 */
const envSchema = z.object({
    PRIVATE_KEY: z
        .string()
        .min(64, "PRIVATE_KEY must be at least 64 characters long")
        .refine((value) => isHex(value), {
            message: "PRIVATE_KEY must be a valid hex string",
        }),
    RPC_URLS_L1: z.preprocess(
        (val) => (Array.isArray(val) ? val : JSON.parse(val as string)),
        z.array(z.string().url()).nonempty("RPC_URLS_L1 must be a non-empty array"),
    ),
    RPC_URLS_L2: z.preprocess(
        (val) => (Array.isArray(val) ? val : JSON.parse(val as string)),
        z.array(z.string().url()).nonempty("RPC_URLS_L2 must be a non-empty array"),
    ),
    TRANSACTION_RECEIPT_CONFIRMATIONS: z.coerce.number().min(0),
    TIMEOUT: z.coerce.number().min(0),
    RETRY_INTERVAL: z.coerce.number().min(0),
    CONTRACTS_ADDRESSES: stringToJSONSchema.pipe(contractsAddressesSchema),
    BONDED_RESPONSE_MODULE_ADDRESS: z.string().min(1, "BONDED_RESPONSE_MODULE_ADDRESS is required"),
    BOND_ESCALATION_MODULE_ADDRESS: z.string().min(1, "BOND_ESCALATION_MODULE_ADDRESS is required"),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
    console.error("Environment variable validation failed:", envResult.error.format());
    process.exit(1);
}

const env = envResult.data;

/**
 * Defines the RPC configuration.
 */
const rpcConfig = {
    l1: {
        chainId: env.CONTRACTS_ADDRESSES.l1ChainId as Caip2ChainId,
        urls: env.RPC_URLS_L1,
        transactionReceiptConfirmations: env.TRANSACTION_RECEIPT_CONFIRMATIONS,
        timeout: env.TIMEOUT,
        retryInterval: env.RETRY_INTERVAL,
    },
    l2: {
        chainId: env.CONTRACTS_ADDRESSES.l2ChainId as Caip2ChainId,
        urls: env.RPC_URLS_L2,
        transactionReceiptConfirmations: env.TRANSACTION_RECEIPT_CONFIRMATIONS,
        timeout: env.TIMEOUT,
        retryInterval: env.RETRY_INTERVAL,
    },
};

/**
 * Mocking the BlockNumberService since we don't need it for the script
 */
const mockBlockNumberService = {
    getEpochBlockNumber: async () => {
        return 0n;
    },
} as unknown as BlockNumberService;

const contracts = env.CONTRACTS_ADDRESSES;

const provider = new ProtocolProvider(
    rpcConfig,
    contracts,
    env.PRIVATE_KEY as Hex,
    mockBlockNumberService,
);

/**
 * Approves the necessary modules by calling approveModule on ProtocolProvider.
 */
async function approveModules(): Promise<void> {
    const modulesToApprove = [
        {
            name: "Bonded Response Module",
            address: env.BONDED_RESPONSE_MODULE_ADDRESS as Address,
        },
        {
            name: "Bond Escalation Module",
            address: env.BOND_ESCALATION_MODULE_ADDRESS as Address,
        },
    ];

    let allApproved = true;

    for (const module of modulesToApprove) {
        try {
            await provider.write.approveModule(module.address);
            console.log(`Approved module: ${module.name} at address ${module.address}`);
        } catch (error) {
            allApproved = false;
            console.error(
                `Error approving module ${module.name} at address ${module.address}:`,
                error,
            );
        }
    }

    if (allApproved) {
        console.log("All modules approved successfully.");
    } else {
        console.error("Some modules were not approved successfully.");
        process.exit(1);
    }
}

export { approveModules };
