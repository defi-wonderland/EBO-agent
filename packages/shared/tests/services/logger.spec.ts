import { describe, expect, it } from "vitest";

import { Logger } from "../../src/services/index.js";

describe("Logger Singleton", () => {
    it("creates a logger instance with the given log level", () => {
        const logger = Logger.getInstance();
        expect(logger).toBeInstanceOf(Logger);
        expect(() => Logger.getInstance()).not.toThrow();
    });

    it("returns the same instance if called multiple times", () => {
        const logger1 = Logger.getInstance();
        const logger2 = Logger.getInstance();
        expect(logger1).toBe(logger2);
    });
    it("sets level correctly based on LOG_LEVEL env var", () => {
        let logger1 = Logger.getInstance();
        expect(logger1["level"]).toEqual("info");

        Logger["instance"] = null;
        process.env.LOG_LEVEL = "debug";
        logger1 = Logger.getInstance();

        expect(logger1["level"]).toEqual("debug");
    });
});
