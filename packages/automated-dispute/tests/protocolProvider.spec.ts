import { createPublicClient, createWalletClient, fallback, getContract, http } from "viem";
import { arbitrum } from "viem/chains";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { eboRequestCreatorAbi } from "../src/abis/eboRequestCreator.js";
import { epochManagerAbi } from "../src/abis/epochManager.js";
import { oracleAbi } from "../src/abis/oracle.js";
import { RpcUrlsEmpty } from "../src/exceptions/rpcUrlsEmpty.exception.js";
import { ProtocolProvider } from "../src/index.js";
import { ProtocolContractsAddresses } from "../src/types/index.js";
import { mockedPrivateKey } from "./eboActor/fixtures.js";

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
    const mockRpcUrls = ["http://localhost:8545"];
    const mockContractAddress: ProtocolContractsAddresses = {
        oracle: "0x1234567890123456789012345678901234567890",
        epochManager: "0x1234567890123456789012345678901234567890",
        eboRequestCreator: "0x1234567890123456789012345678901234567890",
    };

    beforeEach(() => {
        (getContract as Mock).mockImplementation(({ address, abi }) => {
            if (abi === oracleAbi && address === mockContractAddress.oracle) {
                return {};
            }
            if (abi === epochManagerAbi && address === mockContractAddress.epochManager) {
                return {
                    read: {
                        currentEpoch: vi.fn(),
                        currentEpochBlock: vi.fn(),
                    },
                };
            }
            if (abi === eboRequestCreatorAbi && address === mockContractAddress.eboRequestCreator) {
                return {
                    simulate: {
                        createRequests: vi.fn(),
                    },
                    write: {
                        createRequests: vi.fn(),
                    },
                };
            }
            throw new Error("Invalid contract address or ABI");
        });

        (createPublicClient as Mock).mockImplementation(() => ({
            simulateContract: vi.fn().mockResolvedValue({
                request: {
                    functionName: "createRequests",
                    args: [],
                },
            }),
            getBlock: vi.fn(),
            waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
        }));

        (createWalletClient as Mock).mockReturnValue({
            writeContract: vi.fn().mockResolvedValue("0xmockedTransactionHash"),
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
                mockRpcUrls,
                mockContractAddress,
                mockedPrivateKey,
            );

            expect(createPublicClient).toHaveBeenCalledWith({
                chain: arbitrum,
                transport: fallback(
                    mockRpcUrls.map((url) =>
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
                    mockRpcUrls.map((url) =>
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
                client: protocolProvider["writeClient"],
            });

            expect(getContract).toHaveBeenCalledWith({
                address: mockContractAddress.epochManager,
                abi: epochManagerAbi,
                client: protocolProvider["readClient"],
            });
        });
        it("throws if rpcUrls are empty", () => {
            expect(
                () => new ProtocolProvider([], mockContractAddress, mockedPrivateKey),
            ).toThrowError(RpcUrlsEmpty);
        });
    });

    describe("getCurrentEpoch", () => {
        it("returns currentEpoch and currentEpochBlock successfully", async () => {
            const mockEpoch = BigInt(1);
            const mockEpochBlock = BigInt(12345);
            const mockEpochTimestamp = BigInt(Date.UTC(2024, 1, 1, 0, 0, 0, 0));

            (createPublicClient as Mock).mockReturnValue({
                getBlock: vi.fn().mockResolvedValue({ timestamp: mockEpochTimestamp }),
            });

            const protocolProvider = new ProtocolProvider(
                mockRpcUrls,
                mockContractAddress,
                mockedPrivateKey,
            );

            (protocolProvider["epochManagerContract"].read.currentEpoch as Mock).mockResolvedValue(
                mockEpoch,
            );

            (
                protocolProvider["epochManagerContract"].read.currentEpochBlock as Mock
            ).mockResolvedValue(mockEpochBlock);

            const result = await protocolProvider.getCurrentEpoch();

            expect(result.currentEpoch).toBe(mockEpoch);
            expect(result.currentEpochBlockNumber).toBe(mockEpochBlock);
            expect(result.currentEpochTimestamp).toBe(mockEpochTimestamp);
        });
        it("throws when current epoch request fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcUrls,
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
                mockRpcUrls,
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

    describe.skip("getEvents", () => {
        it("returns all events ordered asc by block and log index");
        it.skip("includes `new epoch` event if needed"); // TODO: confirm if this is needed
        it.skip("includes `request can be finalized` event if needed"); // TODO: confirm if this is needed
        it("throws if the block range is not consistent");
        it("throws if the RPC client fails");
    });

    describe.skip("hasStakedAssets", () => {
        it("returns true if the address has more than 0 assets staked");
        it("returns false if the address has 0 staked assets");
    });

    describe.skip("createRequest", () => {
        it("succeeds if the RPC client sent the request");
        // NOTE: Should we validate if the request was created by
        // tracking the transaction result somehow? I feel like it's
        // somewhat brittle to just wish for the tx to be processed.
        it("throws if the epoch is not current");
        it("throws if chains is empty");
        it("throws if the RPC client fails");
    });

    describe.skip("getAvailableChains", () => {
        it("returns an array of available chains in CAIP-2 compliant format");
        it("throws if the RPC client fails");
    });

    describe.skip("proposeResponse", () => {
        it("returns if the RPC client sent the response");
        it("throws if the RPC client fails");
    });

    describe.skip("disputeResponse", () => {
        it("returns if the RPC client sent the dispute");
        it("throws if the RPC client fails");
    });

    describe.skip("pledgeForDispute", () => {
        it("returns if the RPC client sent the pledge");
        it("throws if the RPC client fails");
    });

    describe.skip("pledgeAgainsDispute", () => {
        it("returns if the RPC client sent the pledge");
        it("throws if the RPC client fails");
    });

    describe.skip("finalize", () => {
        it("returns if the RPC client finalizes the pledge");
        it("throws if the RPC client fails");
    });

    describe("createRequest", () => {
        const mockRpcUrls = ["http://localhost:8545"];
        const mockContractAddress: ProtocolContractsAddresses = {
            oracle: "0x1234567890123456789012345678901234567890",
            epochManager: "0x1234567890123456789012345678901234567890",
            eboRequestCreator: "0x1234567890123456789012345678901234567890",
        };

        it("creates a request successfully", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcUrls,
                mockContractAddress,
                mockedPrivateKey,
            );

            const mockEpoch = 1n;
            const mockChains = ["eip155:1", "eip155:42161"];

            const mockWriteContractResponse = "0xmockedTransactionHash";
            (protocolProvider["writeClient"].writeContract as Mock).mockResolvedValue(
                mockWriteContractResponse,
            );

            await protocolProvider.createRequest(mockEpoch, mockChains);

            expect(protocolProvider["readClient"].simulateContract).toHaveBeenCalledWith({
                address: undefined,
                abi: eboRequestCreatorAbi,
                functionName: "createRequests",
                args: [mockEpoch, mockChains],
                account: undefined,
            });

            expect(protocolProvider["writeClient"].writeContract).toHaveBeenCalledWith(
                expect.objectContaining({
                    functionName: "createRequests",
                    args: [],
                }),
            );
        });

        it("throws if chains array is empty", async () => {
            const protocolProvider = new ProtocolProvider(
                ["http://localhost:8545"],
                {
                    oracle: "0x1234567890123456789012345678901234567890",
                    epochManager: "0x1234567890123456789012345678901234567890",
                    eboRequestCreator: "0x1234567890123456789012345678901234567890",
                },
                mockedPrivateKey,
            );

            await expect(protocolProvider.createRequest(1n, [])).rejects.toThrow(
                "Chains array cannot be empty",
            );
        });
    });
});
