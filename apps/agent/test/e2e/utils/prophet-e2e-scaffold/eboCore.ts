import assert from "assert";
import { Caip2ChainId } from "@ebo-agent/shared";
import { execa } from "execa";
import {
    Account,
    Address,
    Chain,
    createPublicClient,
    createTestClient,
    createWalletClient,
    encodeFunctionData,
    formatEther,
    http,
    HttpTransport,
    parseAbi,
    parseEther,
    publicActions,
    walletActions,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { AnvilClient } from "./anvil.js";

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
    anvilClient: AnvilClient<HttpTransport, Chain, Account | undefined>,
    grt: {
        fundAmount: bigint;
        holderAddress: Address;
        contractAddress: Address;
    },
) {
    await anvilClient.impersonateAccount({
        address: grt.holderAddress,
    });

    console.log(`Impersonating ${grt.holderAddress}...`);

    await anvilClient.setBalance({
        address: grt.holderAddress,
        value: parseEther("100"),
    });

    console.log(`Added 1 ETH to ${grt.holderAddress}.`);

    await anvilClient.setBalance({
        address: account.address,
        value: parseEther("100"),
    });

    console.log(`Added 1 ETH to ${account.address}.`);

    console.log(`Sending GRT tokens from ${grt.holderAddress} to ${account.address}...`);

    const hash = await anvilClient.sendTransaction({
        account: grt.holderAddress,
        to: grt.contractAddress,
        data: transferGrtToAccount(account.address, grt.fundAmount),
    });

    console.log("Waiting for transaction receipt...");

    await anvilClient.waitForTransactionReceipt({
        hash: hash,
    });

    console.log(`GRT tokens sent.`);

    await anvilClient.stopImpersonatingAccount({ address: grt.holderAddress });
}

interface SetUpAccountConfig {
    localRpcUrl: string;
    chain: Chain;
    deployedContracts: DeployContractsOutput;
    grtHolder: Address;
    grtContractAddress: Address;
    grtFundAmount: bigint;
}

/**
 * Fund an account with ETH and GRT to interact with smart contracts. Also, issues
 * the respective approvals for modules to be allowed to operate.
 *
 * @param config {SetUpAccountConfig}
 * @returns the private key, the account and a wallet client for the set up account
 */
export async function setUpAccount(config: SetUpAccountConfig) {
    const { localRpcUrl, chain, grtHolder, grtContractAddress, grtFundAmount } = config;

    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const localRpcTransport = http(localRpcUrl);

    const publicClient = createPublicClient({
        chain: chain,
        transport: localRpcTransport,
    });

    const walletClient = createWalletClient({
        account,
        chain: chain,
        transport: localRpcTransport,
    });

    const anvilClient = createTestClient({
        mode: "anvil",
        account: grtHolder,
        chain: chain,
        transport: localRpcTransport,
    })
        .extend(publicActions)
        .extend(walletActions);

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
    // Keystore password
    keystorePassword: string;
    // Data to use to generate the ebo core .env file
    eboCoreEnvContent: {
        // Local anvil RPC URL (most likely http://127.0.0.1/1)
        protocolRpc: string;
        // Wallet to use for local deployment
        protocolDeployerName: string;
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
    const { keystorePassword, eboCorePath, eboCoreEnvContent } = config;

    console.log("Deploying smart contracts...");

    // TODO: cast wallet import...
    // TODO: generate custom ebo-core/.env on the fly to be used by ebo-core's `yarn deploy:arbitrum`

    const { stdout } = await execa({
        cwd: eboCorePath,
    })`forge script Deploy --rpc-url ${eboCoreEnvContent.protocolRpc} --account ARBITRUM_DEPLOYER --broadcast --chain arbitrum -vv --password ${keystorePassword}`;

    const deployedContractsMatches = stdout.matchAll(DEPLOYED_CONTRACTS_REGEX);

    const contracts = [...deployedContractsMatches].reduce((addresses, contractAddress) => {
        const name = contractAddress[1];
        const address = contractAddress[2];

        return { ...addresses, [name]: address as Address };
    }, {} as DeployContractsOutput);

    console.dir(contracts, { depth: null });

    return contracts;
}

interface SetUpProphetInput {
    /** Chains to add to EBORequestCreator contract */
    chainsToAdd: Caip2ChainId[];
    /** Accounts to approve modules for */
    accounts: Account[];
    /** Map of deployed contracts */
    deployedContracts: DeployContractsOutput;
    /** GRT amount to provision account with to be able to bond tokens throughout its operation */
    grtProvisionAmount: bigint;
    /** Arbitrator address to use to add chains into EBORequestCreator  */
    arbitratorAddress: Address;
    /** GRT address */
    grtAddress: Address;
    /** Horizon staking address */
    horizonStakingAddress: Address;
    /** Anvil client */
    anvilClient: AnvilClient<HttpTransport, Chain, undefined>;
}

/**
 * Set up Prophet and EBO contracts with basic data to start operating with them
 *
 * @param input {@link SetUpProphetInput}
 */
export async function setUpProphet(input: SetUpProphetInput) {
    const {
        chainsToAdd,
        accounts,
        deployedContracts,
        anvilClient,
        grtProvisionAmount: bondAmount,
    } = input;
    const { arbitratorAddress, grtAddress, horizonStakingAddress } = input;

    await approveEboProphetModules(accounts, deployedContracts, anvilClient);
    await stakeGrtWithProvision(
        accounts,
        {
            grt: grtAddress,
            horizonStaking: horizonStakingAddress,
            horizonAccountingExtension: deployedContracts["HorizonAccountingExtension"],
        },
        bondAmount,
        anvilClient,
    );
    await addEboRequestCreatorChains(
        chainsToAdd,
        deployedContracts,
        anvilClient,
        arbitratorAddress,
    );
}

/**
 * Approve EBO core accounting modules usage.
 *
 * @param accounts accounts to approve modules for
 * @param deployedContracts addresses of deployed contracts
 * @param clients.public a public viem client
 * @param clients.wallet a wallet viem client
 */
async function approveEboProphetModules(
    accounts: Account[],
    deployedContracts: DeployContractsOutput,
    anvilClient: AnvilClient<HttpTransport, Chain, undefined>,
) {
    console.log(`Approving accounting modules...`);

    const modulesToBeApproved = [
        deployedContracts["BondedResponseModule"],
        deployedContracts["BondEscalationModule"],
    ];

    for (const account of accounts) {
        await Promise.all(
            modulesToBeApproved.map(async (moduleAddress, index) => {
                console.log(
                    `Approving ${moduleAddress} through HorizonAccountingExtension ${deployedContracts["HorizonAccountingExtension"]}`,
                );

                const hash = await anvilClient.sendTransaction({
                    account: account,
                    to: deployedContracts["HorizonAccountingExtension"],
                    data: encodeFunctionData({
                        abi: parseAbi(["function approveModule(address) external"]),
                        args: [moduleAddress],
                    }),
                    nonce: index,
                });

                await anvilClient.waitForTransactionReceipt({
                    hash: hash,
                });
            }),
        );

        const approvedModules = await anvilClient.readContract({
            address: deployedContracts["HorizonAccountingExtension"],
            abi: parseAbi(["function approvedModules(address) external view returns (address[])"]),
            functionName: "approvedModules",
            args: [account.address],
        });

        console.log(`Modules approved for ${account.address}:`);
        console.dir(approvedModules);
    }
}

async function stakeGrtWithProvision(
    accounts: Account[],
    addresses: {
        grt: Address;
        horizonStaking: Address;
        horizonAccountingExtension: Address;
    },
    grtProvisionAmount: bigint,
    anvilClient: AnvilClient<HttpTransport, Chain, undefined>,
) {
    console.log("Staking GRT into Horizon...");

    const { grt, horizonStaking, horizonAccountingExtension } = addresses;

    for (const account of accounts) {
        console.log(`Approving GRT txs on ${account.address} to ${horizonStaking}`);

        const approveHash = await anvilClient.sendTransaction({
            account: account,
            to: grt,
            data: encodeFunctionData({
                abi: parseAbi(["function approve(address, uint256)"]),
                args: [horizonStaking, grtProvisionAmount],
            }),
        });

        await anvilClient.waitForTransactionReceipt({
            hash: approveHash,
        });

        console.log(`Staking for ${account.address} ${formatEther(grtProvisionAmount)} GRT...`);

        const stakeHash = await anvilClient.sendTransaction({
            account: account,
            to: horizonStaking,
            data: encodeFunctionData({
                abi: parseAbi(["function stake(uint256)"]),
                args: [grtProvisionAmount],
            }),
        });

        await anvilClient.waitForTransactionReceipt({
            hash: stakeHash,
        });

        console.log(
            `Provisioning ${account.address} with ${formatEther(grtProvisionAmount)} GRT...`,
        );

        const provisionHash = await anvilClient.sendTransaction({
            account: account,
            to: horizonStaking,
            data: encodeFunctionData({
                abi: parseAbi(["function provision(address, address, uint256, uint32, uint64)"]),
                args: [
                    account.address,
                    horizonAccountingExtension,
                    grtProvisionAmount,
                    // TODO: use contract call to get this value
                    // https://github.com/defi-wonderland/EBO-core/blob/175bcd57c3254a90dd6fcbf53b3db3359085551f/src/contracts/HorizonAccountingExtension.sol#L38C26-L38C42
                    1_000_000,
                    // https://github.com/defi-wonderland/EBO-core/blob/175bcd57c3254a90dd6fcbf53b3db3359085551f/script/Constants.sol#L21
                    BigInt(60 * 60 * 24 * 3), // 3 days
                ],
            }),
        });

        await anvilClient.waitForTransactionReceipt({
            hash: provisionHash,
        });

        console.log(`Stake and provision done for ${account.address}`);
    }
}

/**
 * Add indexed chains to EBORequestCreator contract.
 *
 * @param chainsToAdd array of Caip2 compliant ids
 * @param deployedContracts {@link DeployContractsOutput}
 * @param client anvil client
 * @param arbitratorAddress address to use for adding chains
 */
async function addEboRequestCreatorChains(
    chainsToAdd: Caip2ChainId[],
    deployedContracts: DeployContractsOutput,
    client: AnvilClient<HttpTransport, Chain, undefined>,
    arbitratorAddress: Address,
) {
    await client.impersonateAccount({
        address: arbitratorAddress,
    });

    await client.setBalance({
        address: arbitratorAddress,
        value: parseEther("1"),
    });

    await Promise.all(
        chainsToAdd.map(async (chainId, index) => {
            console.log(`Adding ${chainId} to EBORequestCreator...`);

            const addChainTxHash = await client.sendTransaction({
                account: arbitratorAddress,
                from: arbitratorAddress,
                to: deployedContracts["EBORequestCreator"],
                data: encodeFunctionData({
                    abi: parseAbi(["function addChain(string calldata _chainId)"]),
                    args: [chainId],
                    functionName: "addChain",
                }),
                nonce: index,
            });

            await client.waitForTransactionReceipt({
                hash: addChainTxHash,
                confirmations: 1,
            });

            console.log(`${chainId} added.`);
        }),
    );

    await client.stopImpersonatingAccount({ address: arbitratorAddress });
}
