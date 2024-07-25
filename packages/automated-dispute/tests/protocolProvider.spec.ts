import { createPublicClient, fallback, getContract, http } from "viem";
import { arbitrum } from "viem/chains";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { epochManagerAbi } from "../src/abis/epochManager.js";
import { oracleAbi } from "../src/abis/oracle.js";
import { RpcUrlsEmpty } from "../src/exceptions/rpcUrlsEmpty.exception.js";
import { ProtocolProvider } from "../src/index.js";
import { ProtocolContractsAddresses } from "../src/types/index.js";

vi.mock("viem", async () => {
    const actual = await vi.importActual("viem");
    return {
        ...actual,
        http: vi.fn(),
        fallback: vi.fn(),
        createPublicClient: vi.fn(),
        getContract: vi.fn(),
    };
});

describe("ProtocolProvider", () => {
    const mockRpcUrls = ["http://localhost:8545"];
    const mockContractAddress: ProtocolContractsAddresses = {
        oracle: "0x1234567890123456789012345678901234567890",
        epochManager: "0x1234567890123456789012345678901234567890",
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
            const protocolProvider = new ProtocolProvider(mockRpcUrls, mockContractAddress);

            expect(createPublicClient).toHaveBeenCalledWith({
                chain: arbitrum,
                transport: fallback(mockRpcUrls.map((url) => http(url))),
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
            expect(() => new ProtocolProvider([], mockContractAddress)).toThrowError(RpcUrlsEmpty);
        });
    });
    describe("getCurrentEpoch", () => {
        it("returns currentEpoch and currentEpochBlock successfully", async () => {
            const protocolProvider = new ProtocolProvider(mockRpcUrls, mockContractAddress);

            const mockEpoch = BigInt(1);
            const mockEpochBlock = BigInt(12345);

            (protocolProvider["epochManagerContract"].read.currentEpoch as Mock).mockResolvedValue(
                mockEpoch,
            );
            (
                protocolProvider["epochManagerContract"].read.currentEpochBlock as Mock
            ).mockResolvedValue(mockEpochBlock);

            const result = await protocolProvider.getCurrentEpoch();

            expect(result.currentEpoch).toBe(mockEpoch);
            expect(result.currentEpochBlock).toBe(mockEpochBlock);
        });
        it("throws when current epoch request fails", async () => {
            const protocolProvider = new ProtocolProvider(mockRpcUrls, mockContractAddress);
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
            const protocolProvider = new ProtocolProvider(mockRpcUrls, mockContractAddress);
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
        it("throws when current epoch block request fails", async () => {
            const protocolProvider = new ProtocolProvider(mockRpcUrls, mockContractAddress);
            const currentEpochError = new Error("Failed to get current epoch");
            const currentEpochBlockError = new Error("Failed to get current epoch block");

            (protocolProvider["epochManagerContract"].read.currentEpoch as Mock).mockRejectedValue(
                currentEpochError,
            );
            (
                protocolProvider["epochManagerContract"].read.currentEpochBlock as Mock
            ).mockRejectedValue(currentEpochBlockError);

            await expect(protocolProvider.getCurrentEpoch()).rejects.toThrow(currentEpochError);
        });
    });
});
