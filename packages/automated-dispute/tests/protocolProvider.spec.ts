import { createPublicClient, createWalletClient, fallback, getContract, http } from "viem";
import { arbitrum } from "viem/chains";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { eboRequestCreatorAbi } from "../src/abis/eboRequestCreator.js";
import { epochManagerAbi } from "../src/abis/epochManager.js";
import { oracleAbi } from "../src/abis/oracle.js";
import { EBORequestCreator_ChainNotAdded } from "../src/exceptions/chainNotAdded.exception.js";
import { EBORequestCreator_InvalidEpoch } from "../src/exceptions/invalidEpoch.exception.js";
import { Oracle_InvalidRequestBody } from "../src/exceptions/invalidRequestBody.exception.js";
import { EBORequestModule_InvalidRequester } from "../src/exceptions/invalidRequester.exception.js";
import { RpcUrlsEmpty } from "../src/exceptions/rpcUrlsEmpty.exception.js";
import { ProtocolProvider } from "../src/index.js";
import { ProtocolContractsAddresses } from "../src/types/index.js";
import { privateKey } from "./eboActor/fixtures.js";

vi.mock("viem", async () => {
    const actual = await vi.importActual("viem");
    return {
        ...actual,
        http: vi.fn(),
        fallback: vi.fn(),
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
            if (abi == oracleAbi && address == mockContractAddress.oracle) {
                return {};
            }
            if (abi == epochManagerAbi && address == mockContractAddress.epochManager) {
                return {
                    read: {
                        currentEpoch: vi.fn(),
                        currentEpochBlock: vi.fn(),
                    },
                };
            }
            if (abi == eboRequestCreatorAbi && address == mockContractAddress.eboRequestCreator) {
                return {
                    write: {
                        createRequests: vi.fn(),
                    },
                };
            }
            throw new Error("Invalid contract address or ABI");
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
                privateKey,
            );

            expect(createPublicClient).toHaveBeenCalledWith({
                chain: arbitrum,
                transport: fallback(mockRpcUrls.map((url) => http(url))),
            });

            expect(createWalletClient).toHaveBeenCalledWith({
                chain: arbitrum,
                transport: fallback(mockRpcUrls.map((url) => http(url))),
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
                client: protocolProvider["client"],
            });
            expect(getContract).toHaveBeenCalledWith({
                address: mockContractAddress.epochManager,
                abi: epochManagerAbi,
                client: protocolProvider["client"],
            });
        });
        it("throws if rpcUrls are empty", () => {
            expect(() => new ProtocolProvider([], mockContractAddress, privateKey)).toThrowError(
                RpcUrlsEmpty,
            );
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
                privateKey,
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
        });
        it("throws when current epoch request fails", async () => {
            const protocolProvider = new ProtocolProvider(
                mockRpcUrls,
                mockContractAddress,
                privateKey,
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
                privateKey,
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

    describe("createRequest", () => {
        it("succeeds if the RPC client sent the request", async () => {
            const mockEpoch = BigInt(1);
            const mockChains = ["eip155:1", "eip155:42161"];
            const protocolProvider = new ProtocolProvider(
                mockRpcUrls,
                mockContractAddress,
                privateKey,
            );

            const mockCreateRequests = vi.fn().mockResolvedValue(undefined);
            vi.spyOn(
                protocolProvider["eboRequestCreatorContract"].write,
                "createRequests",
            ).mockImplementation(mockCreateRequests);

            await protocolProvider.createRequest(mockEpoch, mockChains);

            expect(mockCreateRequests).toHaveBeenCalledWith([mockEpoch, mockChains]);
        });

        it("throws EBORequestCreator_InvalidEpoch if the epoch is invalid", async () => {
            const mockEpoch = BigInt(0);
            const mockChains = ["eip155:1", "eip155:42161"];
            const protocolProvider = new ProtocolProvider(
                mockRpcUrls,
                mockContractAddress,
                privateKey,
            );

            const mockCreateRequests = vi
                .fn()
                .mockRejectedValue(new EBORequestCreator_InvalidEpoch());
            vi.spyOn(
                protocolProvider["eboRequestCreatorContract"].write,
                "createRequests",
            ).mockImplementation(mockCreateRequests);

            await expect(protocolProvider.createRequest(mockEpoch, mockChains)).rejects.toThrow(
                EBORequestCreator_InvalidEpoch,
            );
        });

        it("throws Oracle_InvalidRequestBody if the request body is invalid", async () => {
            const mockEpoch = BigInt(1);
            const mockChains = ["eip155:1", "eip155:42161"];
            const protocolProvider = new ProtocolProvider(
                mockRpcUrls,
                mockContractAddress,
                privateKey,
            );

            const mockCreateRequests = vi.fn().mockRejectedValue(new Oracle_InvalidRequestBody());
            vi.spyOn(
                protocolProvider["eboRequestCreatorContract"].write,
                "createRequests",
            ).mockImplementation(mockCreateRequests);

            await expect(protocolProvider.createRequest(mockEpoch, mockChains)).rejects.toThrow(
                Oracle_InvalidRequestBody,
            );
        });

        it("throws EBORequestModule_InvalidRequester if the requester is invalid", async () => {
            const mockEpoch = BigInt(1);
            const mockChains = ["eip155:1", "eip155:42161"];
            const protocolProvider = new ProtocolProvider(
                mockRpcUrls,
                mockContractAddress,
                privateKey,
            );

            const mockCreateRequests = vi
                .fn()
                .mockRejectedValue(new EBORequestModule_InvalidRequester());
            vi.spyOn(
                protocolProvider["eboRequestCreatorContract"].write,
                "createRequests",
            ).mockImplementation(mockCreateRequests);

            await expect(protocolProvider.createRequest(mockEpoch, mockChains)).rejects.toThrow(
                EBORequestModule_InvalidRequester,
            );
        });

        it("throws EBORequestCreator_ChainNotAdded if one of the specified chains is not added", async () => {
            const mockEpoch = BigInt(1);
            const mockChains = ["eip155:1", "eip155:42161"];
            const protocolProvider = new ProtocolProvider(
                mockRpcUrls,
                mockContractAddress,
                privateKey,
            );

            const mockCreateRequests = vi
                .fn()
                .mockRejectedValue(new EBORequestCreator_ChainNotAdded());
            vi.spyOn(
                protocolProvider["eboRequestCreatorContract"].write,
                "createRequests",
            ).mockImplementation(mockCreateRequests);

            await expect(protocolProvider.createRequest(mockEpoch, mockChains)).rejects.toThrow(
                EBORequestCreator_ChainNotAdded,
            );
        });

        it("throws if the RPC client fails", async () => {
            const mockEpoch = BigInt(1);
            const mockChains = ["eip155:1", "eip155:42161"];
            const protocolProvider = new ProtocolProvider(
                mockRpcUrls,
                mockContractAddress,
                privateKey,
            );

            const mockCreateRequests = vi.fn().mockRejectedValue(new Error("RPC client error"));
            vi.spyOn(
                protocolProvider["eboRequestCreatorContract"].write,
                "createRequests",
            ).mockImplementation(mockCreateRequests);

            await expect(protocolProvider.createRequest(mockEpoch, mockChains)).rejects.toThrow(
                "RPC client error",
            );
        });
    });
});
