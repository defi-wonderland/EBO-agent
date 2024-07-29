import { describe, expect, it } from "vitest";

import { Logger } from "../src/logger.js";

describe("Logger Singleton", () => {
    it("creates a logger instance with the given log level", () => {
        const logger = Logger.getInstance("info");
        expect(logger).toBeInstanceOf(Logger);
        expect(() => Logger.getInstance()).not.toThrow();
    });

    it("throws an error if no log level is provided on first instantiation", () => {
        Logger["instance"] = null;
        expect(() => Logger.getInstance()).toThrow(
            new Error("Initial configuration is required for the first instantiation."),
        );
    });

    it("returns the same instance if called multiple times", () => {
        const logger1 = Logger.getInstance("info");
        const logger2 = Logger.getInstance("warn");
        expect(logger1).toBe(logger2);
    });
});
