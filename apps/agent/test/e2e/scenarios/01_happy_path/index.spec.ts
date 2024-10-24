import {
    EboActorsManager,
    EboProcessor,
    NotificationService,
    oracleAbi,
    ProphetCodec,
    ProtocolProvider,
} from "@ebo-agent/automated-dispute";
import { Request, RequestId } from "@ebo-agent/automated-dispute/dist/types/prophet.js";
import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId, Logger, UnixTimestamp } from "@ebo-agent/shared";
import { CreateServerReturnType } from "prool";
import {
    Account,
    Address,
    createTestClient,
    getAbiItem,
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

import type { DeployContractsOutput } from "../../utils/prophet-e2e-scaffold/index.js";
import { getCurrentEpoch, setEpochLength } from "../../utils/prophet-e2e-scaffold/epochManager.js";
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

// TODO: probably could be added as a submodule inside the e2e folder
const EBO_CORE_PATH = "../../../EBO-core/";

// Arbitrum Sepolia
const GRT_HOLDER = "0xadE6B8EB69a49B56929C1d4F4b428d791861dB6f";
const GRT_CONTRACT_ADDRESS = "0x1A1af8B44fD59dd2bbEb456D1b7604c7bd340702";
const HORIZON_STAKING_ADDRESS = "0x3F53F9f9a5d7F36dCC869f8D2F227499c411c0cf";

// Extracted from https://thegraph.com/docs/en/network/contracts/
const EPOCH_MANAGER_ADDRESS = "0x7975475801BEf845f10Ce7784DC69aB1e0344f11";
const GOVERNOR_ADDRESS = "0xadE6B8EB69a49B56929C1d4F4b428d791861dB6f";

// Arbitrum
// const GRT_HOLDER = "0x00669A4CF01450B64E8A2A20E9b1FCB71E61eF03";
// const GRT_CONTRACT_ADDRESS = "0x9623063377ad1b27544c965ccd7342f7ea7e88c7";

// // Extracted from https://thegraph.com/docs/en/network/contracts/
// const EPOCH_MANAGER_ADDRESS = "0x5A843145c43d328B9bB7a4401d94918f131bB281";

// TODO: this is currently hardcoded on the contract's Deploy script, change when defined
const ARBITRATOR_ADDRESS: Address = padHex("0x100", { dir: "left", size: 20 });

const ARBITRUM_SEPOLIA_ID = "eip155:421614";

const PROTOCOL_L2_CHAIN = arbitrumSepolia;
const PROTOCOL_L2_CHAIN_ID = ARBITRUM_SEPOLIA_ID;

const PROTOCOL_L2_LOCAL_RPC_HOST = "127.0.0.1";
const PROTOCOL_L2_LOCAL_RPC_PORT = 8545;

const FORK_L2_URL = "https://arbitrum-sepolia.gateway.tenderly.co";

const PROTOCOL_L2_LOCAL_URL = `http://${PROTOCOL_L2_LOCAL_RPC_HOST}:${PROTOCOL_L2_LOCAL_RPC_PORT}/1`;

const newEventAbi = parseAbiItem(
    "event NewEpoch(uint256 indexed _epoch, string indexed _chainId, uint256 _blockNumber)",
);

describe.sequential("single agent", () => {
    let l2ProtocolAnvil: CreateServerReturnType;

    let protocolContracts: DeployContractsOutput;
    let accounts: { privateKey: Hex; account: Account; walletClient: WalletClient }[];

    beforeEach(async () => {
        l2ProtocolAnvil = await createAnvilServer(
            PROTOCOL_L2_LOCAL_RPC_HOST,
            PROTOCOL_L2_LOCAL_RPC_PORT,
            {
                forkUrl: FORK_L2_URL,
                slotsInAnEpoch: 1,
                blockTime: 0.1,
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
                grtFundAmount: parseEther("50"),
            }),
        ];

        await setUpProphet({
            accounts: accounts.map((account) => account.account),
            arbitratorAddress: ARBITRATOR_ADDRESS,
            grtAddress: GRT_CONTRACT_ADDRESS,
            horizonStakingAddress: HORIZON_STAKING_ADDRESS,
            chainsToAdd: [PROTOCOL_L2_CHAIN_ID],
            grtProvisionAmount: parseEther("45"),
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
        await l2ProtocolAnvil.stop();
    });

    test.skip("basic flow", { timeout: E2E_TEST_TIMEOUT }, async () => {
        const logger = Logger.getInstance();

        const protocolProvider = new ProtocolProvider(
            {
                l1: {
                    chainId: PROTOCOL_L2_CHAIN_ID,
                    // Using the same RPC due to Anvil's arbitrum block number bug
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

        // Set epoch length to a big enough epoch length as in sepolia is way too short at the moment
        await setEpochLength({
            length: 100_000n,
            client: anvilClient,
            epochManagerAddress: EPOCH_MANAGER_ADDRESS,
            governorAddress: GOVERNOR_ADDRESS,
        });

        const initBlock = await anvilClient.getBlockNumber();
        const currentEpoch = await getCurrentEpoch({
            client: anvilClient,
            epochManagerAddress: EPOCH_MANAGER_ADDRESS,
        });

        processor.start(3000);

        const requestCreatedAbi = getAbiItem({ abi: oracleAbi, name: "RequestCreated" });

        let chainRequestId: Hex;

        const requestCreatedEvent = await waitForEvent({
            client: anvilClient,
            filter: {
                address: protocolContracts["Oracle"],
                fromBlock: initBlock,
                event: requestCreatedAbi,
                strict: true,
            },
            matcher: (log) => {
                const { requestModuleData } = log.args._request;
                const { chainId } = ProphetCodec.decodeRequestRequestModuleData(requestModuleData);

                if (chainId !== ARBITRUM_SEPOLIA_ID) return false;

                chainRequestId = log.args._requestId;

                return true;
            },
            pollingIntervalMs: 100,
            blockTimeout: initBlock + 1000n,
        });

        expect(requestCreatedEvent).toBeDefined();

        const responseProposedAbi = getAbiItem({ abi: oracleAbi, name: "ResponseProposed" });

        const responseProposedEvent = await waitForEvent({
            client: anvilClient,
            filter: {
                address: protocolContracts["Oracle"],
                fromBlock: initBlock,
                event: responseProposedAbi,
                strict: true,
            },
            matcher: (log) => {
                return log.args._requestId === chainRequestId;
            },
            pollingIntervalMs: 100,
            blockTimeout: initBlock + 1000n,
        });

        expect(responseProposedEvent).toBeDefined();

        await anvilClient.increaseTime({ seconds: 60 * 60 * 24 * 7 * 4 });

        const oracleRequestFinalizedAbi = getAbiItem({
            abi: oracleAbi,
            name: "OracleRequestFinalized",
        });

        const [oracleRequestFinalizedEvent, newEpochEvent] = await Promise.all([
            waitForEvent({
                client: anvilClient,
                filter: {
                    address: protocolContracts["Oracle"],
                    fromBlock: initBlock,
                    event: oracleRequestFinalizedAbi,
                    strict: true,
                },
                matcher: (log) => {
                    return log.args._requestId === chainRequestId;
                },
                pollingIntervalMs: 100,
                blockTimeout: initBlock + 1000n,
            }),
            waitForEvent({
                client: anvilClient,
                filter: {
                    address: protocolContracts["EBOFinalityModule"],
                    fromBlock: initBlock,
                    event: newEventAbi,
                    strict: true,
                },
                matcher: (log) => {
                    return (
                        log.args._chainId === keccak256(toHex(ARBITRUM_SEPOLIA_ID)) &&
                        log.args._epoch === currentEpoch
                    );
                },
                pollingIntervalMs: 100,
                blockTimeout: initBlock + 1000n,
            }),
        ]);

        expect(oracleRequestFinalizedEvent).toBeDefined();
        expect(newEpochEvent).toBeDefined();
    });

    /**
     * Given:
     *  - A single agent A1 operating for chain CHAIN1
     *  - A request REQ1 for E1, a wrong response RESP1(REQ1)
     *  - Within the RESP1 dispute window
     *
     *  When:
     *  - A1 detects RESP1 is wrong
     *
     *  Then:
     *  - A1 disputes RESP1 with DISP1
     *      - `ResponseDisputed(RESP1.id, DISP1.id, DISP1)`
     *  - A1 proposes RESP2
     *      - `ResponseProposed(REQ1.id, RESP2.id, RESP2)`
     *  - A1 settles DISP1 and it ends with status `Won`
     *      - `DisputeStatusUpdated(DISP1.id, DISP1, "Won")`
     *  - A1 finalizes REQ1 with RESP2
     *      - `EBOFinalityModule.newEpoch(E1, CHAIN1, RESP2.response)`
     *      - `OracleRequestFinalized(REQ1.id, RESP2.id, A1.address)`
     */
    test("dispute response and propose a new one", { timeout: E2E_TEST_TIMEOUT }, async () => {
        const logger = Logger.getInstance();

        const protocolProvider = new ProtocolProvider(
            {
                l1: {
                    chainId: PROTOCOL_L2_CHAIN_ID,
                    // Using the same RPC due to Anvil's arbitrum block number bug
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

        // Set epoch length to a big enough epoch length as in sepolia is way too short at the moment
        await setEpochLength({
            length: 100_000n,
            client: anvilClient,
            epochManagerAddress: EPOCH_MANAGER_ADDRESS,
            governorAddress: GOVERNOR_ADDRESS,
        });

        const initBlock = await anvilClient.getBlockNumber();
        const currentEpoch = await protocolProvider.getCurrentEpoch();

        const correctResponse = await blockNumberService.getEpochBlockNumber(
            currentEpoch.startTimestamp,
            PROTOCOL_L2_CHAIN_ID,
        );

        await protocolProvider.createRequest(currentEpoch.number, PROTOCOL_L2_CHAIN_ID);

        const requestCreatedEvent = await waitForEvent({
            client: anvilClient,
            filter: {
                address: protocolContracts["Oracle"],
                fromBlock: initBlock,
                event: getAbiItem({ abi: oracleAbi, name: "RequestCreated" }),
                strict: true,
            },
            pollingIntervalMs: 100,
            blockTimeout: initBlock + 1000n,
        });

        expect(requestCreatedEvent).toBeDefined();

        await protocolProvider.proposeResponse(requestCreatedEvent.args._request, {
            proposer: accounts[0].account.address,
            requestId: requestCreatedEvent.args._requestId as RequestId,
            response: ProphetCodec.encodeResponse({ block: correctResponse - 1n }),
        });

        const badResponseProposedEvent = await waitForEvent({
            client: anvilClient,
            filter: {
                address: protocolContracts["Oracle"],
                fromBlock: initBlock,
                event: getAbiItem({ abi: oracleAbi, name: "ResponseProposed" }),
                strict: true,
            },
            pollingIntervalMs: 100,
            blockTimeout: initBlock + 1000n,
        });

        processor.start(3000);

        const badResponseDisputedEvent = await waitForEvent({
            client: anvilClient,
            filter: {
                address: protocolContracts["Oracle"],
                fromBlock: initBlock,
                event: getAbiItem({ abi: oracleAbi, name: "ResponseDisputed" }),
                strict: true,
            },
            matcher: (log) => {
                return log.args._responseId === badResponseProposedEvent.args._responseId;
            },
            pollingIntervalMs: 100,
            blockTimeout: initBlock + 1000n,
        });

        expect(badResponseDisputedEvent).toBeDefined();

        const correctResponseProposedEvent = await waitForEvent({
            client: anvilClient,
            filter: {
                address: protocolContracts["Oracle"],
                fromBlock: initBlock,
                event: getAbiItem({ abi: oracleAbi, name: "ResponseProposed" }),
                strict: true,
            },
            matcher: (log) => {
                const responseBlock = ProphetCodec.decodeResponse(
                    log.args._response.response,
                ).block;

                return (
                    log.args._requestId === requestCreatedEvent.args._requestId &&
                    log.args._responseId !== badResponseProposedEvent.args._responseId &&
                    responseBlock === correctResponse
                );
            },
            pollingIntervalMs: 100,
            blockTimeout: initBlock + 1000n,
        });

        expect(correctResponseProposedEvent).toBeDefined();

        await anvilClient.increaseTime({ seconds: 60 * 60 * 24 * 7 * 4 });

        // FIXME: check for `DisputeStatusUpdated(DISP1.id, DISP1, "Won")`
        const [requestFinalizedEvent, newEpochEvent] = await Promise.all([
            waitForEvent({
                client: anvilClient,
                filter: {
                    address: protocolContracts["Oracle"],
                    fromBlock: initBlock,
                    event: getAbiItem({ abi: oracleAbi, name: "OracleRequestFinalized" }),
                    strict: true,
                },
                matcher: (log) => {
                    return (
                        log.args._requestId === requestCreatedEvent.args._requestId &&
                        log.args._responseId === correctResponseProposedEvent.args._responseId
                    );
                },
                pollingIntervalMs: 100,
                blockTimeout: initBlock + 1000n,
            }),
            waitForEvent({
                client: anvilClient,
                filter: {
                    address: protocolContracts["EBOFinalityModule"],
                    fromBlock: initBlock,
                    event: newEventAbi,
                    strict: true,
                },
                matcher: (log) => {
                    return (
                        log.args._chainId === keccak256(toHex(ARBITRUM_SEPOLIA_ID)) &&
                        log.args._epoch === currentEpoch.number
                    );
                },
                pollingIntervalMs: 100,
                blockTimeout: initBlock + 1000n,
            }),
        ]);

        expect(requestFinalizedEvent).toBeDefined();
        expect(newEpochEvent).toBeDefined();
    });
});
