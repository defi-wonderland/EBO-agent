import { vi } from "vitest";

// This is a mock private key
vi.stubEnv("PRIVATE_KEY", "0x3e2b98faf910877596c092f668da8f5532ac8caac74094ec276ee4cd8891dc34");
vi.stubEnv("TRANSACTION_RECEIPT_CONFIRMATIONS", "1");
vi.stubEnv("TIMEOUT", "3000");
vi.stubEnv("RETRY_INTERVAL", "1000");
vi.stubEnv("RPC_URLS_L1", '["https://l1.rpc.url"]');
vi.stubEnv("RPC_URLS_L2", '["https://l2.rpc.url"]');
vi.stubEnv(
    "CONTRACTS_ADDRESSES",
    JSON.stringify({
        l1ChainId: "eip155:1",
        l2ChainId: "eip155:42161",
        oracle: "0x0000000000000000000000000000000000000001",
        epochManager: "0x0000000000000000000000000000000000000002",
        bondEscalationModule: "0x0000000000000000000000000000000000000003",
        horizonAccountingExtension: "0x0000000000000000000000000000000000000004",
    }),
);
vi.stubEnv("BONDED_RESPONSE_MODULE_ADDRESS", "0xBondedResponseModule");
vi.stubEnv("BOND_ESCALATION_MODULE_ADDRESS", "0xBondEscalationModule");
