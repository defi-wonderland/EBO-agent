/**
 * Script to approve modules for bonding operations.
 *
 * This script approves the Bonded Response Module
 * and Bond Escalation Module by calling the approveModule function
 * on the HorizonAccountingExtension contract.
 *
 * Usage:
 *   Set the required environment variables in a .env file, then run the script:
 *     tsx utilities/approveAccountingModules
 */

import { ProtocolProvider } from "@ebo-agent/automated-dispute/src/index.js";
import * as dotenv from "dotenv";
import { Address, Hex, isHex } from "viem";
import { z } from "zod";

dotenv.config();

/**
 * Define and validate environment variables using Zod.
 */
const envSchema = z.object({
    PRIVATE_KEY: z
        .string()
        .min(64, "PRIVATE_KEY must be at least 64 characters long")
        .refine((value) => isHex(value), {
            message: "PRIVATE_KEY must be a valid hex string",
        }),
    // Vitest may load arrays as a string so we handle both cases
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
    CONTRACTS_ADDRESSES: z
        .string()
        .transform((val) => JSON.parse(val))
        .refine((val) => typeof val === "object", "CONTRACTS_ADDRESSES must be a JSON object"),
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
