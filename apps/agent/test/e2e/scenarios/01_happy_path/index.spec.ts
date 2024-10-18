import {
    EboActorsManager,
    EboProcessor,
    NotificationService,
    ProtocolProvider,
} from "@ebo-agent/automated-dispute";
import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId, Logger } from "@ebo-agent/shared";
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
    parseEther,
    publicActions,
    toHex,
    walletActions,
    WalletClient,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
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

// TODO: it'd be nice to have zod here
const KEYSTORE_PASSWORD = process.env.KEYSTORE_PASSWORD || "";

// TODO: use env vars here
const FORK_URL = "https://arbitrum-sepolia.gateway.tenderly.co";

// TODO: probably could be added as a submodule inside the e2e folder
const EBO_CORE_PATH = "../../../EBO-core/";

// Arbitrum Sepolia
const GRT_HOLDER = "0xadE6B8EB69a49B56929C1d4F4b428d791861dB6f";
const GRT_CONTRACT_ADDRESS = "0x1A1af8B44fD59dd2bbEb456D1b7604c7bd340702";
const HORIZON_STAKING_ADDRESS = "0x3F53F9f9a5d7F36dCC869f8D2F227499c411c0cf";

// Extracted from https://thegraph.com/docs/en/network/contracts/
const EPOCH_MANAGER_ADDRESS = "0x7975475801BEf845f10Ce7784DC69aB1e0344f11";

// Arbitrum
// const GRT_HOLDER = "0x00669A4CF01450B64E8A2A20E9b1FCB71E61eF03";
// const GRT_CONTRACT_ADDRESS = "0x9623063377ad1b27544c965ccd7342f7ea7e88c7";

// // Extracted from https://thegraph.com/docs/en/network/contracts/
// const EPOCH_MANAGER_ADDRESS = "0x5A843145c43d328B9bB7a4401d94918f131bB281";

// TODO: this is currently hardcoded on the contract's Deploy script, change when defined
const ARBITRATOR_ADDRESS: Address = padHex("0x100", { dir: "left", size: 20 });

// const ARBITRUM_ID = "eip155:42161";
const ARBITRUM_SEPOLIA_ID = "eip155:421614";

const PROTOCOL_L1_CHAIN_ID = "eip155:1";
const PROTOCOL_L2_CHAIN = arbitrumSepolia;
const PROTOCOL_L2_CHAIN_ID = ARBITRUM_SEPOLIA_ID;

const PROTOCOL_L2_LOCAL_RPC_HOST = "127.0.0.1";
const PROTOCOL_L2_LOCAL_RPC_PORT = 8545;

const PROTOCOL_L2_LOCAL_URL = `http://${PROTOCOL_L2_LOCAL_RPC_HOST}:${PROTOCOL_L2_LOCAL_RPC_PORT}/1`;

describe.sequential("single agent", () => {
    let protocolAnvil: CreateServerReturnType;

    let protocolContracts: DeployContractsOutput;
    let accounts: { privateKey: Hex; account: Account; walletClient: WalletClient }[];

    beforeEach(async () => {
        protocolAnvil = await createAnvilServer(
            PROTOCOL_L2_LOCAL_RPC_HOST,
            PROTOCOL_L2_LOCAL_RPC_PORT,
            {
                forkUrl: FORK_URL,
                blockTime: 0.1,
                slotsInAnEpoch: 1, // To "finalize" blocks fast enough
            },
        );

        // OPTIMIZE: try to reuse protocol chain anvil instance and already deployed contracts
        protocolContracts = await deployContracts({
            keystorePassword: KEYSTORE_PASSWORD,
            eboCorePath: EBO_CORE_PATH,
            eboCoreEnvContent: {
                protocolRpc: PROTOCOL_L2_LOCAL_URL,
                protocolDeployerName: "ARBITRUM_DEPLOYER",
            },
        });

        // TODO: generate N accounts for N agents
        accounts = [
            await setUpAccount({
                localRpcUrl: PROTOCOL_L2_LOCAL_URL,
                deployedContracts: protocolContracts,
                chain: PROTOCOL_L2_CHAIN,
                grtHolder: GRT_HOLDER,
                grtContractAddress: GRT_CONTRACT_ADDRESS,
                grtFundAmount: parseEther("5"),
            }),
        ];

        await setUpProphet({
            accounts: accounts.map((account) => account.account),
            arbitratorAddress: ARBITRATOR_ADDRESS,
            grtAddress: GRT_CONTRACT_ADDRESS,
            horizonStakingAddress: HORIZON_STAKING_ADDRESS,
            chainsToAdd: [PROTOCOL_L2_CHAIN_ID],
            bondAmount: parseEther("0.5"),
            anvilClient: createTestClient({
                mode: "anvil",
                transport: http(PROTOCOL_L2_LOCAL_URL),
                chain: PROTOCOL_L2_CHAIN,
            })
                .extend(publicActions)
                .extend(walletActions),
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
                    chainId: PROTOCOL_L1_CHAIN_ID,
                    urls: [PROTOCOL_L2_LOCAL_URL],
                    transactionReceiptConfirmations: 1,
                    timeout: 1_000,
                    retryInterval: 500,
                },
                l2: {
                    chainId: PROTOCOL_L2_CHAIN_ID,
                    urls: [PROTOCOL_L2_LOCAL_URL],
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
                horizonAccountingExtension: protocolContracts["HorizonAccountingExtension"],
            },
            accounts[0].privateKey,
        );

        vi.spyOn(protocolProvider, "getAccountingApprovedModules").mockResolvedValue([
            protocolContracts["EBORequestModule"],
            protocolContracts["BondedResponseModule"],
            protocolContracts["BondEscalationModule"],
        ]);

        const blockNumberService = new BlockNumberService(
            new Map<Caip2ChainId, string[]>([[PROTOCOL_L2_CHAIN_ID, [PROTOCOL_L2_LOCAL_URL]]]),
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
            {
                notifyError: vi.fn(),
            } as unknown as NotificationService,
        );

        const anvilClient = createTestClient({
            mode: "anvil",
            account: GRT_HOLDER,
            chain: PROTOCOL_L2_CHAIN,
            transport: http(PROTOCOL_L2_LOCAL_URL),
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
                return log.args._chainId === keccak256(toHex(PROTOCOL_L2_CHAIN_ID));
            },
            pollingIntervalMs: 100,
            blockTimeout: initBlock + 1000n,
        });

        expect(eventFound).toBe(true);
    });
});
