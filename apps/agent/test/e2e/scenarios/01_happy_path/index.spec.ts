import { EboActorsManager, EboProcessor, ProtocolProvider } from "@ebo-agent/automated-dispute";
import { BlockNumberService, Caip2ChainId } from "@ebo-agent/blocknumber";
import { Logger } from "@ebo-agent/shared";
import { CreateServerReturnType } from "prool";
import {
    Account,
    Address,
    createTestClient,
    Hex,
    http,
    keccak256,
    padHex,
    parseAbiItem,
    publicActions,
    toHex,
    walletActions,
    WalletClient,
} from "viem";
import { arbitrum } from "viem/chains";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { AnvilClient, DeployContractsOutput } from "../../utils/prophet-e2e-scaffold/index.js";
import {
    createAnvilServer,
    deployContracts,
    setUpAccount,
    setUpProphet,
    waitForEvent,
} from "../../utils/prophet-e2e-scaffold/index.js";

const E2E_SCENARIO_SETUP_TIMEOUT = 60_000;
const E2E_TEST_TIMEOUT = 30_000;

// TODO: use env vars here
const FORK_URL = "https://arb1.arbitrum.io/rpc";
const YARN_CMD = "/path/to/yarn/executable/bin/yarn";
// TODO: probably could be added as a submodule inside the e2e folder
const EBO_CORE_PATH = "../../../EBO-core/";

const GRT_HOLDER = "0x00669A4CF01450B64E8A2A20E9b1FCB71E61eF03";
const GRT_CONTRACT_ADDRESS = "0x9623063377ad1b27544c965ccd7342f7ea7e88c7";

// Extracted from https://thegraph.com/docs/en/network/contracts/
const EPOCH_MANAGER_ADDRESS = "0x5A843145c43d328B9bB7a4401d94918f131bB281";

// TODO: this is currently hardcoded on the contract's Deploy script, change when defined
const ARBITRATOR_ADDRESS: Address = padHex("0x100", { dir: "left", size: 20 });

const ARBITRUM_ID = "eip155:42161";

describe.sequential("single agent", () => {
    let protocolAnvil: CreateServerReturnType;

    let protocolContracts: DeployContractsOutput;
    let accounts: { privateKey: Hex; account: Account; walletClient: WalletClient }[];

    beforeEach(async () => {
        const protocolHost = "127.0.0.1";
        const protocolPort = 8545;

        protocolAnvil = await createAnvilServer(protocolHost, protocolPort, {
            forkUrl: FORK_URL,
            blockTime: 0.1,
            slotsInAnEpoch: 1, // To "finalize" blocks fast enough
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

        // TODO: generate N accounts for N agents
        accounts = [
            await setUpAccount({
                localRpcUrl: url,
                deployedContracts: protocolContracts,
                grtHolder: GRT_HOLDER,
                grtContractAddress: GRT_CONTRACT_ADDRESS,
            }),
        ];

        await setUpProphet({
            accounts: accounts.map((account) => account.account),
            arbitratorAddress: ARBITRATOR_ADDRESS,
            chainsToAdd: ["eip155:42161"],
            anvilClient: createTestClient({
                mode: "anvil",
                transport: http(url),
                chain: arbitrum,
            }),
            deployedContracts: protocolContracts,
        });
    }, E2E_SCENARIO_SETUP_TIMEOUT);

    afterEach(async () => {
        await protocolAnvil.stop();
    });

    test.skip("basic flow", { timeout: E2E_TEST_TIMEOUT }, async () => {
        const logger = Logger.getInstance();

        const protocolProvider = new ProtocolProvider(
            {
                l1: {
                    urls: ["http://127.0.0.1:8545/1"],
                    transactionReceiptConfirmations: 1,
                    timeout: 1_000,
                    retryInterval: 500,
                },
                l2: {
                    urls: ["http://127.0.0.1:8545/1"],
                    transactionReceiptConfirmations: 1,
                    timeout: 1_000,
                    retryInterval: 500,
                },
            },
            {
                bondEscalationModule: protocolContracts["BondEscalationModule"],
                eboRequestCreator: protocolContracts["EBORequestCreator"],
                epochManager: EPOCH_MANAGER_ADDRESS,
                oracle: protocolContracts["Oracle"],
                horizonAccountingExtension: protocolContracts["BondEscalationAccounting"],
            },
            accounts[0].privateKey,
        );

        vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue([
            protocolContracts["EBORequestModule"],
            protocolContracts["BondedResponseModule"],
            protocolContracts["BondEscalationModule"],
        ]);

        const blockNumberService = new BlockNumberService(
            new Map<Caip2ChainId, string[]>([[ARBITRUM_ID, ["http://127.0.0.1:8545/1"]]]),
            {
                baseUrl: new URL("http://not.needed/"),
                bearerToken: "not.needed",
                bearerTokenExpirationWindow: 1000,
                servicePaths: {
                    block: "/block",
                    blockByTime: "/blockByTime",
                },
            },
            logger,
        );

        const actorsManager = new EboActorsManager();

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

        const anvilClient = createTestClient({
            mode: "anvil",
            account: GRT_HOLDER,
            chain: arbitrum,
            transport: http("http://127.0.0.1:8545/1"),
        })
            .extend(publicActions)
            .extend(walletActions);

        const initBlock = await anvilClient.getBlockNumber();

        processor.start(3000);

        // TODO: replace by NewEpoch event
        const requestCreatedAbi = parseAbiItem(
            "event RequestCreated(bytes32 indexed _requestId, uint256 indexed _epoch, string indexed _chainId)",
        );

        const eventFound = await waitForEvent<typeof requestCreatedAbi, AnvilClient>({
            client: anvilClient,
            filter: {
                address: protocolContracts["EBORequestCreator"],
                fromBlock: initBlock,
                event: requestCreatedAbi,
                strict: true,
            },
            matcher: (log) => {
                return log.args._chainId === keccak256(toHex(ARBITRUM_ID));
            },
            pollingIntervalMs: 100,
            blockTimeout: initBlock + 1000n,
        });

        expect(eventFound).toBe(true);
    });
});
