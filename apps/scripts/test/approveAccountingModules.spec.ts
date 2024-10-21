import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { approveModules } from "../utilities/approveAccountingModules.js";

vi.mock("dotenv", () => ({
    config: vi.fn(),
}));

const { mockApproveModule } = vi.hoisted(() => {
    return {
        mockApproveModule: vi.fn(),
    };
});

vi.mock("dotenv", () => ({
    config: vi.fn(),
}));

vi.mock("../../../packages/automated-dispute/src/providers/protocolProvider.js", () => ({
    ProtocolProvider: vi.fn().mockImplementation(() => ({
        write: {
            approveModule: mockApproveModule,
        },
    })),
}));

describe("approveModules script", () => {
    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

        mockApproveModule.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("approves modules successfully", async () => {
        await approveModules();

        expect(mockApproveModule).toHaveBeenCalledTimes(3);
        expect(mockApproveModule).toHaveBeenCalledWith("0xEboRequestModule");
        expect(mockApproveModule).toHaveBeenCalledWith("0xBondedResponseModule");
        expect(mockApproveModule).toHaveBeenCalledWith("0xBondEscalationModule");

        expect(console.log).toHaveBeenCalledWith("Approved module: 0xEboRequestModule");
        expect(console.log).toHaveBeenCalledWith("Approved module: 0xBondedResponseModule");
        expect(console.log).toHaveBeenCalledWith("Approved module: 0xBondEscalationModule");
        expect(console.log).toHaveBeenCalledWith("All modules approved successfully.");
    });

    it("handles errors when approving modules", async () => {
        const error = new Error("Test error");
        mockApproveModule.mockRejectedValueOnce(error);

        await approveModules();

        expect(console.error).toHaveBeenCalledWith("Error approving modules:", error);
        expect(process.exit).toHaveBeenCalledWith(1);
    });
});
