import { EboActorsManager, EboProcessor, ProtocolProvider } from "@ebo-agent/automated-dispute";
import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Logger } from "@ebo-agent/shared";
import { CreateServerReturnType } from "prool";
import { Account, Hex, WalletClient } from "viem";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { DeployContractsOutput } from "../../utils/prophet-e2e-scaffold";
import { createAnvilServer, deployContracts, setUpAccount } from "../../utils/prophet-e2e-scaffold";

// TODO: use env vars here
const FORK_URL = "https://arb-mainnet.g.alchemy.com/v2/REDACTED";
const YARN_CMD = "/path/to/yarn/executable/bin/yarn";
// TODO: probably could be added as a submodule inside the e2e folder
const EBO_CORE_PATH = "/path/toEBO-core/repo";

describe.sequential("single agent", () => {
    let protocolAnvil: CreateServerReturnType;
    let indexedChain: CreateServerReturnType;

    let protocolContracts: DeployContractsOutput;
    let accounts: { privateKey: Hex; account: Account; walletClient: WalletClient }[];

    beforeEach(async () => {
        const protocolHost = "127.0.0.1";
        const protocolPort = 8545;

        protocolAnvil = await createAnvilServer(protocolHost, protocolPort, {
            forkUrl: FORK_URL,
        });

        const url = `http://${protocolHost}:${protocolPort}/1`;

        // OPTIMIZE: try to reuse protocol chain anvil instance and already deployed contracts
        protocolContracts = await deployContracts({
            yarnCmd: YARN_CMD,
            eboCorePath: EBO_CORE_PATH,
            eboCoreEnvContent: {
                arbitrumRpc: url,
                arbitrumDeployerName: "ARBITRUM_DEPLOYER",
            },
        });

        console.dir(protocolContracts);

        // TODO: generate N accounts for N agents
        accounts = [
            await setUpAccount({
                localRpcUrl: url,
                deployedContracts: protocolContracts,
                grtHolder: "0x00669A4CF01450B64E8A2A20E9b1FCB71E61eF03",
                grtContractAddress: "0x9623063377ad1b27544c965ccd7342f7ea7e88c7",
            }),
        ];

        indexedChain = await createAnvilServer("127.0.0.1", 8546, {
            forkUrl: FORK_URL,
        });
    }, 120_000);

    afterEach(async () => {
        await protocolAnvil.stop();
        await indexedChain.stop();
    });

    test.skip("basic flow", { timeout: 120_000 }, async () => {
        const logger = Logger.getInstance();

        const protocolProvider = new ProtocolProvider(
            {
                urls: ["http://localhost:8545/1"],
                transactionReceiptConfirmations: 1,
                timeout: 10_000,
                retryInterval: 1,
            },
            {
                bondEscalationModule: protocolContracts["BondEscalationModule"],
                eboRequestCreator: protocolContracts["EBORequestCreator"],
                // Extracted from https://thegraph.com/docs/en/network/contracts/
                epochManager: "0x5A843145c43d328B9bB7a4401d94918f131bB281",
                oracle: protocolContracts["Oracle"],
            },
            accounts[0].privateKey,
        );

        // TODO: use local RPC of indexed chain if possible
        const blockNumberService = {
            getEpochBlockNumber: async () => 1n,
        } as unknown as BlockNumberService;

        const actorsManager = new EboActorsManager();

        vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue([
            protocolContracts["EBORequestModule"],
            protocolContracts["BondedResponseModule"],
            protocolContracts["BondEscalationModule"],
        ]);

        const processor = new EboProcessor(
            {
                requestModule: protocolContracts["EBORequestModule"],
                responseModule: protocolContracts["BondedResponseModule"],
                escalationModule: protocolContracts["BondEscalationModule"],
            },
            protocolProvider,
            blockNumberService,
            actorsManager,
            logger,
        );

        await processor.start(1);

        // TODO: Most likely, wait for an event to be emitted

        expect(true).toBe(true);
    });
});
