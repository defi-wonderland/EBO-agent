import { ILogger } from "@ebo-agent/shared";
import { vi } from "vitest";

export const mockLogger: () => ILogger = () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
});
