/**
 * Script to approve modules for bonding operations.
 *
 * This script approves the EBO Request Module, Bonded Response Module,
 * and Bond Escalation Module by calling the approveModule function
 * on the HorizonAccountingExtension contract.
 *
 * Usage:
 *   Set the required environment variables in a .env file, then run the script:
 *     tsx utilities/approveAccountingModules
 */

import * as url from "node:url";
import * as dotenv from "dotenv";
import { Address, Hex } from "viem";
import { z } from "zod";

import { ProtocolProvider } from "../../../packages/automated-dispute/src/index.js";

dotenv.config();

/**
 * Define and validate environment variables using Zod.
 */
const envSchema = z.object({
    PRIVATE_KEY: z.string().min(64, "PRIVATE_KEY is required"),
    // Vitest may load arrays as a string so we handle both cases
    RPC_URLS_L1: z.preprocess(
        (val) => (Array.isArray(val) ? val : JSON.parse(val as string)),
        z.array(z.string()).nonempty("RPC_URLS_L1 must be a non-empty array"),
    ),
    RPC_URLS_L2: z.preprocess(
        (val) => (Array.isArray(val) ? val : JSON.parse(val as string)),
        z.array(z.string()).nonempty("RPC_URLS_L2 must be a non-empty array"),
    ),
    TRANSACTION_RECEIPT_CONFIRMATIONS: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 1)),
    TIMEOUT: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 30000)),
    RETRY_INTERVAL: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 1000)),
    CONTRACTS_ADDRESSES: z
        .string()
        .transform((val) => JSON.parse(val))
        .refine((val) => typeof val === "object", "CONTRACTS_ADDRESSES must be a JSON object"),
    EBO_REQUEST_MODULE_ADDRESS: z.string().min(1, "EBO_REQUEST_MODULE_ADDRESS is required"),
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
 * Define the RPC configuration.
 */
const rpcConfig = {
    l1: {
        chainId: env.CONTRACTS_ADDRESSES.l1ChainId,
        urls: env.RPC_URLS_L1,
        transactionReceiptConfirmations: env.TRANSACTION_RECEIPT_CONFIRMATIONS,
        timeout: env.TIMEOUT,
        retryInterval: env.RETRY_INTERVAL,
    },
    l2: {
        chainId: env.CONTRACTS_ADDRESSES.l2ChainId,
        urls: env.RPC_URLS_L2,
        transactionReceiptConfirmations: env.TRANSACTION_RECEIPT_CONFIRMATIONS,
        timeout: env.TIMEOUT,
        retryInterval: env.RETRY_INTERVAL,
    },
};

const contracts = env.CONTRACTS_ADDRESSES;

const provider = new ProtocolProvider(rpcConfig, contracts, env.PRIVATE_KEY as Hex);

/**
 * Approves the necessary modules by calling approveModule on ProtocolProvider.
 */
async function approveModules(): Promise<void> {
    try {
        // Approve EBO Request Module
        await provider.write.approveModule(env.EBO_REQUEST_MODULE_ADDRESS as Address);
        console.log(`Approved module: ${env.EBO_REQUEST_MODULE_ADDRESS}`);

        // Approve Bonded Response Module
        await provider.write.approveModule(env.BONDED_RESPONSE_MODULE_ADDRESS as Address);
        console.log(`Approved module: ${env.BONDED_RESPONSE_MODULE_ADDRESS}`);

        // Approve Bond Escalation Module
        await provider.write.approveModule(env.BOND_ESCALATION_MODULE_ADDRESS as Address);
        console.log(`Approved module: ${env.BOND_ESCALATION_MODULE_ADDRESS}`);

        console.log("All modules approved successfully.");
    } catch (error: unknown) {
        console.error("Error approving modules:", error);
        process.exit(1);
    }
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(process.argv[1]).href) {
    approveModules();
} else {
    console.error("Wrong file path to the current module");
}

export { approveModules };
