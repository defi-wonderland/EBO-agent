import { describe, expect, it } from "vitest";

import { CustomContractError, ErrorFactory } from "../../src/exceptions/index.js";

describe("ErrorFactory", () => {
    it("creates a CustomContractError with the correct name and strategy for known errors", () => {
        const errorName = "ValidatorLib_InvalidResponseBody";
        const error = ErrorFactory.createError(errorName);

        expect(error).toBeInstanceOf(CustomContractError);
        expect(error.name).toBe(errorName);
        expect(error.strategy).toEqual({
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        });
    });

    it("creates a CustomContractError with default strategy for unknown errors", () => {
        const errorName = "UnknownError";
        const error = ErrorFactory.createError(errorName);

        expect(error).toBeInstanceOf(CustomContractError);
        expect(error.name).toBe(errorName);
        expect(error.strategy).toEqual({
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: true,
        });
    });

    it("creates a CustomContractError with custom action for specific errors", () => {
        const errorName = "BondEscalationModule_InvalidDispute";
        const error = ErrorFactory.createError(errorName);

        expect(error).toBeInstanceOf(CustomContractError);
        expect(error.name).toBe(errorName);
        expect(error.strategy).toHaveProperty("customAction");
        expect(typeof error.strategy.customAction).toBe("function");
    });

    it("creates different CustomContractErrors for different error names", () => {
        const error1 = ErrorFactory.createError("ValidatorLib_InvalidResponseBody");
        const error2 = ErrorFactory.createError("BondEscalationAccounting_InsufficientFunds");

        expect(error1.name).not.toBe(error2.name);
        expect(error1.strategy).not.toEqual(error2.strategy);
    });

    it("creates CustomContractErrors with consistent strategies for the same error name", () => {
        const errorName = "ValidatorLib_InvalidResponseBody";
        const error1 = ErrorFactory.createError(errorName);
        const error2 = ErrorFactory.createError(errorName);

        expect(error1.strategy).toEqual(error2.strategy);
    });
});
