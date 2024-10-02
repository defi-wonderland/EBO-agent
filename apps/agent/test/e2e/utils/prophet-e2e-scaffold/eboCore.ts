import assert from "assert";
import { execa } from "execa";
import {
    Account,
    Address,
    createPublicClient,
    createTestClient,
    createWalletClient,
    encodeFunctionData,
    http,
    HttpTransport,
    parseAbi,
    parseEther,
    publicActions,
    PublicClient,
    TestClient,
    walletActions,
    WalletClient,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";

/**
 * Encode the function to transfer ERC20 GRT token to a specified `address`
 *
 * @param address token receiver's address
 * @returns the abi encoded transfer function
 */
function transferGrtToAccount(address: Address, amount: bigint) {
    return encodeFunctionData({
        abi: parseAbi(["function transfer(address, uint256)"]),
        args: [address, amount],
    });
}

/**
 * Fund `account` with `amount` GRT tokens by transferring from a known holder.
 *
 * @param account account to fund
 * @param amount amount of GRT to fund `account` with
 * @param anvilClient wallet client for anvil to use to impersonate the GRT holder
 * @param grt.holderAddress address of the GRT tokens holder
 * @param grt.contractAddress address of the GRT contract address
 */
async function fundAccount(
    account: Account,
    anvilClient: TestClient<"anvil", HttpTransport, typeof arbitrum>,
    grt: {
        fundAmount: bigint;
        holderAddress: Address;
        contractAddress: Address;
    },
) {
    const extendedAnvilClient = anvilClient.extend(publicActions).extend(walletActions);

    await extendedAnvilClient.impersonateAccount({
        address: grt.holderAddress,
    });

    console.log(`Impersonating ${grt.holderAddress}...`);

    await extendedAnvilClient.setBalance({
        address: grt.holderAddress,
        value: parseEther("1"),
    });

    console.log(`Added 1 ETH to ${grt.holderAddress}.`);

    await extendedAnvilClient.setBalance({
        address: account.address,
        value: parseEther("1"),
    });

    console.log(`Added 1 ETH to ${account.address}.`);

    console.log(`Sending GRT tokens from ${grt.holderAddress} to ${account.address}...`);

    const hash = await extendedAnvilClient.sendTransaction({
        account: grt.holderAddress,
        to: grt.contractAddress,
        data: transferGrtToAccount(account.address, grt.fundAmount),
        chain: arbitrum,
    });

    console.log("Waiting for transaction receipt...");

    await extendedAnvilClient.waitForTransactionReceipt({
        hash: hash,
    });

    console.log(`GRT tokens sent.`);

    await extendedAnvilClient.stopImpersonatingAccount({ address: grt.holderAddress });
}

/**
 * Approve EBO core accounting modules usage.
 *
 * @param account account to use to approve modules
 * @param deployedContracts addresses of deployed contracts
 * @param clients.public a public viem client
 * @param clients.wallet a wallet viem client
 */
async function approveEboProphetModules(
    account: Account,
    deployedContracts: DeployContractsOutput,
    clients: {
        public: PublicClient;
        wallet: WalletClient<HttpTransport, typeof arbitrum>;
    },
) {
    console.log(`Approving accounting modules...`);

    const modulesToBeApproved = [
        deployedContracts["EBORequestModule"],
        deployedContracts["BondedResponseModule"],
        deployedContracts["BondEscalationModule"],
    ];

    for (const moduleAddress of modulesToBeApproved) {
        console.log(
            `Approving ${moduleAddress} through BondEscalationAccounting ${deployedContracts["BondEscalationAccounting"]}`,
        );

        const hash = await clients.wallet.sendTransaction({
            account: account,
            to: deployedContracts["BondEscalationAccounting"],
            data: encodeFunctionData({
                abi: parseAbi(["function approveModule(address) external"]),
                args: [moduleAddress],
            }),
        });

        await clients.public.waitForTransactionReceipt({
            hash: hash,
        });
    }

    const approvedModules = await clients.public.readContract({
        address: deployedContracts["BondEscalationAccounting"],
        abi: parseAbi(["function approvedModules(address) external view returns (address[])"]),
        functionName: "approvedModules",
        args: [account.address],
    });

    console.log("Modules approved:");
    console.dir(approvedModules);
}

interface SetUpAccountConfig {
    localRpcUrl: string;
    deployedContracts: DeployContractsOutput;
    grtHolder: Address;
    grtContractAddress: Address;
}

/**
 * Fund an account with ETH and GRT to interact with smart contracts. Also, issues
 * the respective approvals for modules to be allowed to operate.
 *
 * @param config {SetUpAccountConfig}
 * @returns the private key, the account and a wallet client for the set up account
 */
export async function setUpAccount(config: SetUpAccountConfig) {
    const { localRpcUrl, deployedContracts, grtHolder, grtContractAddress } = config;

    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const localRpcTransport = http(localRpcUrl);

    const publicClient = createPublicClient({
        chain: arbitrum,
        transport: localRpcTransport,
    });

    const walletClient = createWalletClient({
        account,
        chain: arbitrum,
        transport: localRpcTransport,
    });

    const anvilClient = createTestClient({
        mode: "anvil",
        account: grtHolder,
        chain: arbitrum,
        transport: localRpcTransport,
    });

    const grtFundAmount = 10n;

    await fundAccount(account, anvilClient, {
        holderAddress: grtHolder,
        contractAddress: grtContractAddress,
        fundAmount: grtFundAmount,
    });

    const balance = await publicClient.readContract({
        address: grtContractAddress,
        abi: parseAbi(["function balanceOf(address) returns (uint256)"]),
        functionName: "balanceOf",
        args: [account.address],
    });

    console.log(`GRT balance for ${account.address} is ${balance}.`);

    assert.strictEqual(
        balance,
        grtFundAmount,
        `Unexpected GRT balance in account ${account.address}`,
    );

    await approveEboProphetModules(account, deployedContracts, {
        public: publicClient,
        wallet: walletClient,
    });

    return {
        privateKey,
        account,
        walletClient,
    };
}

/**
 * Config params to deploy ebo core smart contracts in a local anvil instance.
 */
export interface DeployContractsConfig {
    // ebo-core repo's local path
    eboCorePath: string;
    // Yarn command to be used in ebo core repo
    yarnCmd: string;
    // Data to use to generate the ebo core .env file
    eboCoreEnvContent: {
        // Local anvil RPC URL (most likely http://127.0.0.1/1)
        arbitrumRpc: string;
        // Wallet to use for local deployment
        arbitrumDeployerName: string;
    };
}

export type DeployContractsOutput = Record<string, Address>;

// Based on the ebo-core deploy script output
const DEPLOYED_CONTRACTS_REGEX = /^\s+`(.*)` deployed at: (.*)$/gm;

/**
 * Deploy ebo-core and Prophet contracts into a local anvil instance.
 *
 * @param config {DeployContractsConfig}
 * @returns a map of contract names with their corresponding addresses
 */
export async function deployContracts(
    config: DeployContractsConfig,
): Promise<DeployContractsOutput> {
    // FIXME: `eboCoreEnvContent` will be used when generating .env on the fly
    const { yarnCmd, eboCorePath } = config;

    console.log("Deploying smart contracts...");

    // TODO: cast wallet import...
    // TODO: generate custom ebo-core/.env on the fly to be used by ebo-core's `yarn deploy:arbitrum`

    const { stdout } = await execa({
        cwd: eboCorePath,
    })`${yarnCmd} deploy:arbitrum`;

    const deployedContractsMatches = stdout.matchAll(DEPLOYED_CONTRACTS_REGEX);

    return [...deployedContractsMatches].reduce((addresses, contractAddress) => {
        const name = contractAddress[1];
        const address = contractAddress[2];

        return { ...addresses, [name]: address as Address };
    }, {} as DeployContractsOutput);
}
