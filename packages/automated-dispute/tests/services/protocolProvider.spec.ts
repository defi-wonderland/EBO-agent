import { Caip2ChainId } from "@ebo-agent/shared";
import {
    ContractFunctionRevertedError,
    createPublicClient,
    createWalletClient,
    fallback,
    getContract,
    http,
    isHex,
    Log,
    WaitForTransactionReceiptTimeoutError,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import {
    bondEscalationModuleAbi,
    eboRequestCreatorAbi,
    epochManagerAbi,
    horizonAccountingExtensionAbi,
    oracleAbi,
} from "../../src/abis/index.js";
import {
    InvalidAccountOnClient,
    RpcUrlsEmpty,
    TransactionExecutionError,
    UndefinedBlockTimestamp,
    UnknownDisputeStatus,
} from "../../src/exceptions/index.js";
import { ProtocolContractsAddresses } from "../../src/interfaces/index.js";
import { ProtocolProvider } from "../../src/providers/index.js";
import { DisputeStatus, EboEvent, Response } from "../../src/types/index.js";
import {
    DEFAULT_MOCKED_DISPUTE_DATA,
    DEFAULT_MOCKED_REQUEST_CREATED_DATA,
    DEFAULT_MOCKED_RESPONSE_DATA,
    mockedPrivateKey,
} from "./eboActor/fixtures.js";

vi.mock("viem", async () => {
    const actual = await vi.importActual("viem");
    return {
        ...actual,
        http: vi.fn((url, options) => ({ url, ...options })),
        fallback: vi.fn((transports) => transports),
        createPublicClient: vi.fn(),
        createWalletClient: vi.fn(),
        getContract: vi.fn(),
    };
});

describe("ProtocolProvider", () => {
    const mockRpcConfig = {
        l1: {
            urls: ["http://localhost:8545"],
            retryInterval: 1,
            timeout: 100,
            transactionReceiptConfirmations: 1,
        },
        l2: {
            urls: ["http://localhost:8546"],
            retryInterval: 1,
            timeout: 100,
            transactionReceiptConfirmations: 1,
        },
    };

    const mockContractAddress: ProtocolContractsAddresses = {
        oracle: "0x1234567890123456789012345678901234567890",
        epochManager: "0x1234567890123456789012345678901234567890",
        eboRequestCreator: "0x1234567890123456789012345678901234567890",
        bondEscalationModule: "0x1234567890123456789012345678901234567890",
        horizonAccountingExtension: "0x1234567890123456789012345678901234567890",
    };

    beforeEach(() => {
        (getContract as Mock).mockImplementation(({ address, abi }) => {
            if (abi === oracleAbi && address === mockContractAddress.oracle) {
                return { address };
            }
            if (abi === epochManagerAbi && address === mockContractAddress.epochManager) {
                return {
                    address,
                    read: {
                        currentEpoch: vi.fn(),
                        currentEpochBlock: vi.fn(),
                    },
                };
            }
            if (abi === eboRequestCreatorAbi && address === mockContractAddress.eboRequestCreator) {
                return {
                    address,
                    simulate: {
                        createRequests: vi.fn(),
                    },
                    write: {
                        createRequests: vi.fn(),
                    },
                };
            }
            if (
                abi === bondEscalationModuleAbi &&
                address === mockContractAddress.bondEscalationModule
            ) {
                return {
                    address,
                    write: {
                        pledgeForDispute: vi.fn(),
                        pledgeAgainstDispute: vi.fn(),
                        settleDispute: vi.fn(),
                    },
                };
            }
            if (
                abi === horizonAccountingExtensionAbi &&
                address === mockContractAddress.horizonAccountingExtension
            ) {
                return {
                    address,
                    read: {
                        approvedModules: vi.fn(),
                    },
                    write: {
                        approveModule: vi.fn(),
                    },
                };
            }
            throw new Error("Invalid contract address or ABI");
        });

        (createPublicClient as Mock).mockImplementation(() => ({
            simulateContract: vi.fn().mockImplementation(({ functionName, args }) => {
                return Promise.resolve({
                    request: {
                        functionName,
                        args,
                    },
                });
            }),
            getBlock: vi.fn().mockResolvedValue({ timestamp: 1697530555n }),
            waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
            getContractEvents: vi.fn(),
        }));

        const mockAccount = privateKeyToAccount(mockedPrivateKey);

        (createWalletClient as Mock).mockReturnValue({
            writeContract: vi.fn().mockResolvedValue("0xmockedTransactionHash"),
            account: mockAccount,
        });

        (http as Mock).mockImplementation((url) => url);
        (fallback as Mock).mockImplementation((transports) => transports);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor", () => {
        it("creates a new ProtocolProvider instance successfully", () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            expect(createPublicClient).toHaveBeenCalledWith({
                chain: arbitrum,
                transport: fallback(
                    mockRpcConfig.l2.urls.map((url) =>
                        http(url, {
                            timeout: protocolProvider["TIMEOUT"],
                            retryDelay: protocolProvider["RETRY_INTERVAL"],
                        }),
                    ),
                ),
            });

            expect(createWalletClient).toHaveBeenCalledWith({
                chain: arbitrum,
                transport: fallback(
                    mockRpcConfig.l2.urls.map((url) =>
                        http(url, {
                            timeout: protocolProvider["TIMEOUT"],
                            retryDelay: protocolProvider["RETRY_INTERVAL"],
                        }),
                    ),
                ),
                account: expect.objectContaining({
                    address: expect.any(String),
                    publicKey: expect.any(String),
                    signMessage: expect.any(Function),
                    signTransaction: expect.any(Function),
                    signTypedData: expect.any(Function),
                    source: "privateKey",
                    type: "local",
                }),
            });

            expect(getContract).toHaveBeenCalledWith({
                address: mockContractAddress.oracle,
                abi: oracleAbi,
                client: protocolProvider["l2WriteClient"],
            });

            expect(getContract).toHaveBeenCalledWith({
                address: mockContractAddress.epochManager,
                abi: epochManagerAbi,
                client: protocolProvider["l2ReadClient"],
            });
        });

        it("throws if L1 rpcUrls are empty", () => {
            expect(
                () =>
                    new ProtocolProvider(
                        { ...mockRpcConfig, l1: { ...mockRpcConfig.l1, urls: [] } },
                        mockContractAddress,
                        mockedPrivateKey,
                    ),
            ).toThrowError(RpcUrlsEmpty);
        });

        it("throws if L2 rpcUrls are empty", () => {
            expect(
                () =>
                    new ProtocolProvider(
                        { ...mockRpcConfig, l2: { ...mockRpcConfig.l2, urls: [] } },
                        mockContractAddress,
                        mockedPrivateKey,
                    ),
            ).toThrowError(RpcUrlsEmpty);
        });
    });

    describe("encodeResponse", () => {
        const response: Response["decodedData"]["response"] = {
            block: 1n,
        };

        it("generates a hex string with the response encoded", () => {
            const encodedResponse = ProtocolProvider.encodeResponse(response);

            expect(encodedResponse).toSatisfy((bytes) => isHex(bytes));
        });

        it("is able to decode encoded data correctly", () => {
            const encodedResponse = ProtocolProvider.encodeResponse(response);
            const decodedResponse = ProtocolProvider.decodeResponse(encodedResponse);

            expect(decodedResponse).toEqual(response);
        });
    });

    // TODO: whenever we manage to create an actual Request on-chain we can use it
    //  to feed an encoded Request here for testing
    describe.todo("decodeRequestResponseModuleData");
    describe.todo("decodeRequestDisputeModuleData");

    describe("getCurrentEpoch", () => {
        it("returns currentEpoch and currentEpochBlock successfully", async () => {
            const mockEpoch = BigInt(1);
            const mockEpochBlock = BigInt(12345);
            const mockEpochTimestamp = BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0)) / 1000n;

            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["epochManagerContract"].read.currentEpoch as Mock).mockResolvedValue(
                mockEpoch,
            );

            (
                protocolProvider["epochManagerContract"].read.currentEpochBlock as Mock
            ).mockResolvedValue(mockEpochBlock);

            (protocolProvider["l1ReadClient"].getBlock as Mock).mockResolvedValue({
                timestamp: mockEpochTimestamp,
            });

            const result = await protocolProvider.getCurrentEpoch();

            expect(result.number).toBe(mockEpoch);
            expect(result.firstBlockNumber).toBe(mockEpochBlock);
            expect(result.startTimestamp).toBe(mockEpochTimestamp);
        });

        it("throws when current epoch request fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );
            const error = new Error("Failed to get current epoch");
            const mockEpochBlock = BigInt(12345);

            (protocolProvider["epochManagerContract"].read.currentEpoch as Mock).mockRejectedValue(
                error,
            );
            (
                protocolProvider["epochManagerContract"].read.currentEpochBlock as Mock
            ).mockResolvedValue(mockEpochBlock);

            await expect(protocolProvider.getCurrentEpoch()).rejects.toThrow(error);
        });

        it("throws when current epoch block request fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );
            const error = new Error("Failed to get current epoch block");
            const mockEpoch = BigInt(12345);

            (protocolProvider["epochManagerContract"].read.currentEpoch as Mock).mockResolvedValue(
                mockEpoch,
            );
            (
                protocolProvider["epochManagerContract"].read.currentEpochBlock as Mock
            ).mockRejectedValue(error);

            await expect(protocolProvider.getCurrentEpoch()).rejects.toThrow(error);
        });
    });

    describe.skip("getAvailableChains", () => {
        it("returns an array of available chains in CAIP-2 compliant format");
        it("throws if the RPC client fails");
    });

    describe("proposeResponse", () => {
        it("successfully proposes a response", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;

            await expect(
                protocolProvider.proposeResponse(mockRequestProphetData, mockResponseProphetData),
            ).resolves.not.toThrow();
        });

        it("throws TransactionExecutionError when transaction fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2ReadClient"].waitForTransactionReceipt as Mock).mockResolvedValue({
                status: "reverted",
            });

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;

            await expect(
                protocolProvider.proposeResponse(mockRequestProphetData, mockResponseProphetData),
            ).rejects.toThrow(TransactionExecutionError);
        });

        it("throws when transaction couldn't be confirmed", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2WriteClient"].writeContract as Mock).mockRejectedValue(
                new Error("Transaction couldn't be confirmed"),
            );

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;

            await expect(
                protocolProvider.proposeResponse(mockRequestProphetData, mockResponseProphetData),
            ).rejects.toThrow("Transaction couldn't be confirmed");
        });

        it("throws ContractFunctionRevertedError when viem throws it", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2ReadClient"].simulateContract as Mock).mockRejectedValue(
                new ContractFunctionRevertedError({
                    abi: eboRequestCreatorAbi,
                    functionName: "proposeResponse",
                }),
            );

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;

            await expect(
                protocolProvider.proposeResponse(mockRequestProphetData, mockResponseProphetData),
            ).rejects.toThrow('The contract function "proposeResponse" reverted.');
        });

        it("throws WaitForTransactionReceiptTimeoutError when waitForTransactionReceipt times out", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2ReadClient"].waitForTransactionReceipt as Mock).mockRejectedValue(
                new WaitForTransactionReceiptTimeoutError({ hash: "0xmockedTransactionHash" }),
            );

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;

            await expect(
                protocolProvider.proposeResponse(mockRequestProphetData, mockResponseProphetData),
            ).rejects.toThrow(WaitForTransactionReceiptTimeoutError);
        });
    });

    describe("disputeResponse", () => {
        it("successfully disputes a response", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;
            const mockDisputeProphetData = DEFAULT_MOCKED_DISPUTE_DATA.prophetData;

            await expect(
                protocolProvider.disputeResponse(
                    mockRequestProphetData,
                    mockResponseProphetData,
                    mockDisputeProphetData,
                ),
            ).resolves.not.toThrow();
        });

        it("throws TransactionExecutionError when transaction fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2ReadClient"].waitForTransactionReceipt as Mock).mockResolvedValue({
                status: "reverted",
            });

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;
            const mockDisputeProphetData = DEFAULT_MOCKED_DISPUTE_DATA.prophetData;

            await expect(
                protocolProvider.disputeResponse(
                    mockRequestProphetData,
                    mockResponseProphetData,
                    mockDisputeProphetData,
                ),
            ).rejects.toThrow(TransactionExecutionError);
        });
    });

    describe("escalateDispute", () => {
        it("successfully escalates a dispute", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;
            const mockDisputeProphetData = DEFAULT_MOCKED_DISPUTE_DATA.prophetData;

            await expect(
                protocolProvider.escalateDispute(
                    mockRequestProphetData,
                    mockResponseProphetData,
                    mockDisputeProphetData,
                ),
            ).resolves.not.toThrow();
        });

        it("throws TransactionExecutionError when transaction fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2ReadClient"].waitForTransactionReceipt as Mock).mockResolvedValue({
                status: "reverted",
            });

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;
            const mockDisputeProphetData = DEFAULT_MOCKED_DISPUTE_DATA.prophetData;

            await expect(
                protocolProvider.escalateDispute(
                    mockRequestProphetData,
                    mockResponseProphetData,
                    mockDisputeProphetData,
                ),
            ).rejects.toThrow(TransactionExecutionError);
        });
    });

    describe.skip("pledgeForDispute", () => {
        it("returns if the RPC client sent the pledge");
        it("throws if the RPC client fails");
    });

    describe.skip("pledgeAgainsDispute", () => {
        it("returns if the RPC client sent the pledge");
        it("throws if the RPC client fails");
    });

    describe("finalize", () => {
        it("successfully finalizes a request", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;

            await expect(
                protocolProvider.finalize(mockRequestProphetData, mockResponseProphetData),
            ).resolves.not.toThrow();
        });

        it("throws TransactionExecutionError when transaction fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2ReadClient"].waitForTransactionReceipt as Mock).mockResolvedValue({
                status: "reverted",
            });

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;

            await expect(
                protocolProvider.finalize(mockRequestProphetData, mockResponseProphetData),
            ).rejects.toThrow(TransactionExecutionError);
        });
    });

    describe("createRequest", () => {
        it("creates a request successfully", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockEpoch = 1n;
            const mockChain: Caip2ChainId = "eip155:42161";

            const mockWriteContractResponse = "0xmockedTransactionHash";
            (protocolProvider["l2WriteClient"].writeContract as Mock).mockResolvedValue(
                mockWriteContractResponse,
            );

            await protocolProvider.createRequest(mockEpoch, mockChain);

            expect(protocolProvider["l2ReadClient"].simulateContract).toHaveBeenCalledWith({
                address: mockContractAddress.eboRequestCreator,
                abi: eboRequestCreatorAbi,
                functionName: "createRequest",
                args: [mockEpoch, mockChain],
                account: expect.any(Object),
            });

            expect(protocolProvider["l2WriteClient"].writeContract).toHaveBeenCalledWith(
                expect.objectContaining({
                    functionName: "createRequest",
                    args: [mockEpoch, mockChain],
                }),
            );
        });
    });

    describe("getAccountAddress", () => {
        it("returns the correct account address", () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const expectedAddress = privateKeyToAccount(mockedPrivateKey).address;
            expect(protocolProvider.getAccountAddress()).toBe(expectedAddress);
        });

        it("throws InvalidAccountOnClient when there's no account", () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2WriteClient"] as any).account = undefined;

            expect(() => protocolProvider.getAccountAddress()).toThrow(InvalidAccountOnClient);
        });
    });

    describe("pledgeForDispute", () => {
        it("successfully pledges for a dispute", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockDisputeProphetData = DEFAULT_MOCKED_DISPUTE_DATA.prophetData;

            await expect(
                protocolProvider.pledgeForDispute(mockRequestProphetData, mockDisputeProphetData),
            ).resolves.not.toThrow();
        });

        it("throws TransactionExecutionError when transaction fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2ReadClient"].waitForTransactionReceipt as Mock).mockResolvedValue({
                status: "reverted",
            });

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockDisputeProphetData = DEFAULT_MOCKED_DISPUTE_DATA.prophetData;

            await expect(
                protocolProvider.pledgeForDispute(mockRequestProphetData, mockDisputeProphetData),
            ).rejects.toThrow(TransactionExecutionError);
        });
    });

    describe("pledgeAgainstDispute", () => {
        it("successfully pledges against a dispute", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockDisputeProphetData = DEFAULT_MOCKED_DISPUTE_DATA.prophetData;

            await expect(
                protocolProvider.pledgeAgainstDispute(
                    mockRequestProphetData,
                    mockDisputeProphetData,
                ),
            ).resolves.not.toThrow();
        });

        it("throws TransactionExecutionError when transaction fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2ReadClient"].waitForTransactionReceipt as Mock).mockResolvedValue({
                status: "reverted",
            });

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockDisputeProphetData = DEFAULT_MOCKED_DISPUTE_DATA.prophetData;

            await expect(
                protocolProvider.pledgeAgainstDispute(
                    mockRequestProphetData,
                    mockDisputeProphetData,
                ),
            ).rejects.toThrow(TransactionExecutionError);
        });
    });

    describe("settleDispute", () => {
        it("successfully settles a dispute", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;
            const mockDisputeProphetData = DEFAULT_MOCKED_DISPUTE_DATA.prophetData;

            await expect(
                protocolProvider.settleDispute(
                    mockRequestProphetData,
                    mockResponseProphetData,
                    mockDisputeProphetData,
                ),
            ).resolves.not.toThrow();
        });

        it("throws TransactionExecutionError when transaction fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2ReadClient"].waitForTransactionReceipt as Mock).mockResolvedValue({
                status: "reverted",
            });

            const mockRequestProphetData = DEFAULT_MOCKED_REQUEST_CREATED_DATA.prophetData;
            const mockResponseProphetData = DEFAULT_MOCKED_RESPONSE_DATA.prophetData;
            const mockDisputeProphetData = DEFAULT_MOCKED_DISPUTE_DATA.prophetData;

            await expect(
                protocolProvider.settleDispute(
                    mockRequestProphetData,
                    mockResponseProphetData,
                    mockDisputeProphetData,
                ),
            ).rejects.toThrow(TransactionExecutionError);
        });
    });

    describe("approveModule", () => {
        it("successfully approves a module", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockModuleAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

            await expect(protocolProvider.approveModule(mockModuleAddress)).resolves.not.toThrow();

            expect(protocolProvider["l2ReadClient"].simulateContract).toHaveBeenCalledWith({
                address: mockContractAddress.horizonAccountingExtension,
                abi: horizonAccountingExtensionAbi,
                functionName: "approveModule",
                args: [mockModuleAddress],
                account: expect.any(Object),
            });

            expect(protocolProvider["l2WriteClient"].writeContract).toHaveBeenCalledWith(
                expect.objectContaining({
                    functionName: "approveModule",
                    args: [mockModuleAddress],
                }),
            );
        });

        it("throws TransactionExecutionError when transaction fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2ReadClient"].waitForTransactionReceipt as Mock).mockResolvedValue({
                status: "reverted",
            });

            const mockModuleAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

            await expect(protocolProvider.approveModule(mockModuleAddress)).rejects.toThrow(
                TransactionExecutionError,
            );
        });
    });

    describe("approvedModules", () => {
        it("successfully retrieves approved modules for a user", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockUserAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
            const mockApprovedModules = [
                "0x1111111111111111111111111111111111111111",
                "0x2222222222222222222222222222222222222222",
            ];

            (
                protocolProvider["horizonAccountingExtensionContract"].read.approvedModules as Mock
            ).mockResolvedValue(mockApprovedModules);

            const result = await protocolProvider.getApprovedModules(mockUserAddress);

            expect(result).toEqual(mockApprovedModules);
            expect(
                protocolProvider["horizonAccountingExtensionContract"].read.approvedModules,
            ).toHaveBeenCalledWith([mockUserAddress]);
        });

        it("throws error when RPC client fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockUserAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
            const error = new Error("RPC client failed");

            (
                protocolProvider["horizonAccountingExtensionContract"].read.approvedModules as Mock
            ).mockRejectedValue(error);

            await expect(protocolProvider.getApprovedModules(mockUserAddress)).rejects.toThrow(
                error,
            );
        });
    });

    describe("getOracleEvents", () => {
        it("successfully fetches and parses Oracle events", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockResponseProposedEvents = [
                {
                    name: "ResponseProposed",
                    blockNumber: 1n,
                    logIndex: 1,
                    requestId: "0xrequestid",
                    metadata: {
                        requestId: "0xrequestid",
                        responseId: "0xresponseid",
                        response: "0xresponse",
                    },
                    rawLog: {},
                },
            ];

            const mockResponseDisputedEvents = [
                {
                    name: "ResponseDisputed",
                    blockNumber: 2n,
                    logIndex: 2,
                    requestId: "0xrequestid",
                    metadata: {
                        responseId: "0xresponseid",
                        disputeId: "0xdisputeid",
                        dispute: { requestId: "0xrequestid" },
                    },
                    rawLog: {},
                },
            ];

            vi.spyOn(protocolProvider as any, "getResponseProposedEvents").mockResolvedValue(
                mockResponseProposedEvents,
            );
            vi.spyOn(protocolProvider as any, "getResponseDisputedEvents").mockResolvedValue(
                mockResponseDisputedEvents,
            );
            vi.spyOn(protocolProvider as any, "getDisputeStatusUpdatedEvents").mockResolvedValue(
                [],
            );
            vi.spyOn(protocolProvider as any, "getDisputeEscalatedEvents").mockResolvedValue([]);
            vi.spyOn(protocolProvider as any, "getOracleRequestFinalizedEvents").mockResolvedValue(
                [],
            );

            const result = await protocolProvider.getOracleEvents(0n, 100n);

            expect(result).toHaveLength(2);
            expect(result).toEqual([mockResponseProposedEvents[0], mockResponseDisputedEvents[0]]);
        });
    });

    describe("getEBORequestCreatorEvents", () => {
        it("successfully fetches and parses EBORequestCreator events", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["l2ReadClient"] as any).getContractEvents = vi
                .fn()
                .mockResolvedValue([
                    {
                        address: "0x1234567890123456789012345678901234567890",
                        args: {
                            _requestId: "0x123",
                            _epoch: 1n,
                            _chainId: "eip155:1",
                        },
                        blockNumber: 1n,
                        logIndex: 1,
                        blockHash:
                            "0x1234567890123456789012345678901234567890123456789012345678901234",
                        transactionHash: "0x1234567890123456789012345678901234567890",
                        transactionIndex: 1,
                        data: "0x0000000000000000000000000000000000000000000000000000000000000003",
                        removed: false,
                        topics: [
                            "0x0000000000000000000000000000000000000000000000000000000000000001",
                            "0x0000000000000000000000000000000000000000000000000000000000000002",
                        ],
                    },
                ]);

            const result = await (protocolProvider as any).getEBORequestCreatorEvents(0n, 100n);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                name: "RequestCreated",
                blockNumber: 1n,
                logIndex: 1,
                requestId: "0x123",
                metadata: {
                    requestId: "0x123",
                    epoch: 1n,
                    chainId: "eip155:1",
                },
                rawLog: {
                    address: "0x1234567890123456789012345678901234567890",
                    args: {
                        _chainId: "eip155:1",
                        _epoch: 1n,
                        _requestId: "0x123",
                    },
                    blockHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
                    blockNumber: 1n,
                    data: "0x0000000000000000000000000000000000000000000000000000000000000003",
                    logIndex: 1,
                    removed: false,
                    topics: [
                        "0x0000000000000000000000000000000000000000000000000000000000000001",
                        "0x0000000000000000000000000000000000000000000000000000000000000002",
                    ],
                    transactionHash: "0x1234567890123456789012345678901234567890",
                    transactionIndex: 1,
                },
                timestamp: 1697530555n,
            });
        });
    });

    describe("getEvents", () => {
        it("successfully merges and sorts events from all sources", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockRequestCreatorEvents: EboEvent<"RequestCreated">[] = [
                {
                    name: "RequestCreated",
                    blockNumber: 1n,
                    logIndex: 0,
                    args: { _requestId: "0x123", _epoch: 1n, _chainId: "eip155:1" },
                },
                {
                    name: "RequestCreated",
                    blockNumber: 3n,
                    logIndex: 0,
                    args: { _requestId: "0x456", _epoch: 2n, _chainId: "eip155:1" },
                },
            ];

            const mockResponseProposedEvents: EboEvent<"ResponseProposed">[] = [
                {
                    name: "ResponseProposed",
                    blockNumber: 2n,
                    logIndex: 1,
                    args: {
                        _requestId: "0x123",
                        _responseId: "0xabc",
                        _response: {
                            proposer: "0x1234",
                            requestId: "0x123",
                            response: "0x5678",
                        },
                    },
                },
            ];

            const mockResponseDisputedEvents: EboEvent<"ResponseDisputed">[] = [
                {
                    name: "ResponseDisputed",
                    blockNumber: 2n,
                    logIndex: 0,
                    args: {
                        _responseId: "0xabc",
                        _disputeId: "0xdef",
                        _dispute: { requestId: "0x123" },
                    },
                },
            ];

            const mockDisputeStatusUpdatedEvents: EboEvent<"DisputeStatusUpdated">[] = [];
            const mockDisputeEscalatedEvents: EboEvent<"DisputeEscalated">[] = [];
            const mockOracleRequestFinalizedEvents: EboEvent<"OracleRequestFinalized">[] = [];

            (protocolProvider["l2ReadClient"].getContractEvents as Mock)
                .mockResolvedValueOnce(mockRequestCreatorEvents)
                .mockResolvedValueOnce(mockResponseProposedEvents)
                .mockResolvedValueOnce(mockResponseDisputedEvents)
                .mockResolvedValueOnce(mockDisputeStatusUpdatedEvents)
                .mockResolvedValueOnce(mockDisputeEscalatedEvents)
                .mockResolvedValueOnce(mockOracleRequestFinalizedEvents);

            const result = await protocolProvider.getEvents(0n, 100n);

            expect(result).toEqual([
                {
                    name: "RequestCreated",
                    blockNumber: 1n,
                    logIndex: 0,
                    requestId: "0x123",
                    metadata: {
                        requestId: "0x123",
                        epoch: 1n,
                        chainId: "eip155:1",
                    },
                    rawLog: mockRequestCreatorEvents[0],
                    timestamp: 1697530555n,
                },
                {
                    name: "ResponseDisputed",
                    blockNumber: 2n,
                    logIndex: 0,
                    requestId: "0x123",
                    metadata: {
                        responseId: "0xabc",
                        disputeId: "0xdef",
                        dispute: { requestId: "0x123" },
                    },
                    rawLog: mockResponseDisputedEvents[0],
                    timestamp: 1697530555n,
                },
                {
                    name: "ResponseProposed",
                    blockNumber: 2n,
                    logIndex: 1,
                    requestId: "0x123",
                    metadata: {
                        requestId: "0x123",
                        responseId: "0xabc",
                        response: {
                            proposer: "0x1234",
                            requestId: "0x123",
                            response: "0x5678",
                        },
                    },
                    rawLog: mockResponseProposedEvents[0],
                    timestamp: 1697530555n,
                },
                {
                    name: "RequestCreated",
                    blockNumber: 3n,
                    logIndex: 0,
                    requestId: "0x456",
                    metadata: {
                        requestId: "0x456",
                        epoch: 2n,
                        chainId: "eip155:1",
                    },
                    rawLog: mockRequestCreatorEvents[1],
                    timestamp: 1697530555n,
                },
            ]);
        });
    });

    describe("getBlockTimestamps", () => {
        it("should return correct blockNumber to timestamp mapping", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const events = [
                { blockNumber: 100n } as Log,
                { blockNumber: 200n } as Log,
                { blockNumber: 100n } as Log,
            ];

            (protocolProvider["l2ReadClient"].getBlock as Mock).mockImplementation(
                ({ blockNumber }) => {
                    return Promise.resolve({
                        timestamp: blockNumber * 10n,
                    });
                },
            );

            const result = await (protocolProvider as any).getBlockTimestamps(events);

            expect(result.size).toBe(2);
            expect(result.get(100n)).toBe(1000n);
            expect(result.get(200n)).toBe(2000n);
        });

        it("should throw UndefinedBlockTimestamp when blockNumber is null", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const events = [{ blockNumber: null } as any as Log, { blockNumber: 100n } as Log];

            await expect((protocolProvider as any).getBlockTimestamps(events)).rejects.toThrow(
                UndefinedBlockTimestamp,
            );
        });

        it("should throw UndefinedBlockTimestamp when blockNumber is undefined", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const events = [{ blockNumber: undefined } as any as Log, { blockNumber: 100n } as Log];

            await expect((protocolProvider as any).getBlockTimestamps(events)).rejects.toThrow(
                UndefinedBlockTimestamp,
            );
        });
    });

    describe("mapDisputeStatus", () => {
        const testCases: Array<{ input: number; expected: DisputeStatus }> = [
            { input: 0, expected: "None" },
            { input: 1, expected: "Active" },
            { input: 2, expected: "Escalated" },
            { input: 3, expected: "Won" },
            { input: 4, expected: "Lost" },
            { input: 5, expected: "NoResolution" },
        ];

        testCases.forEach(({ input, expected }) => {
            it(`should map status ${input} to '${expected}'`, () => {
                const protocolProvider = new ProtocolProvider(
                    mockRpcConfig,
                    mockContractAddress,
                    mockedPrivateKey,
                );

                const result = (protocolProvider as any).mapDisputeStatus(input);
                expect(result).toBe(expected);
            });
        });

        it("should throw UnknownDisputeStatus for invalid status", () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcConfig,
                mockContractAddress,
                mockedPrivateKey,
            );

            const invalidStatuses = [-1, 6, 999];

            invalidStatuses.forEach((status) => {
                expect(() => {
                    (protocolProvider as any).mapDisputeStatus(status);
                }).toThrow(UnknownDisputeStatus);
            });
        });
    });
});
