import { describe, expect, it } from "vitest";

import {
    EBORequestCreator_ChainNotAdded,
    EBORequestCreator_InvalidEpoch,
    EBORequestModule_InvalidRequester,
    Oracle_InvalidRequestBody,
} from "../../src/exceptions/index.js";
import { ErrorFactory } from "../../src/services/index.js";

describe("ErrorFactory", () => {
    it("creates EBORequestCreator_InvalidEpoch error", () => {
        const error = ErrorFactory.createError("EBORequestCreator_InvalidEpoch");
        expect(error).toBeInstanceOf(EBORequestCreator_InvalidEpoch);
    });

    it("creates Oracle_InvalidRequestBody error", () => {
        const error = ErrorFactory.createError("Oracle_InvalidRequestBody");
        expect(error).toBeInstanceOf(Oracle_InvalidRequestBody);
    });

    it("creates EBORequestModule_InvalidRequester error", () => {
        const error = ErrorFactory.createError("EBORequestModule_InvalidRequester");
        expect(error).toBeInstanceOf(EBORequestModule_InvalidRequester);
    });

    it("creates EBORequestCreator_ChainNotAdded error", () => {
        const error = ErrorFactory.createError("EBORequestCreator_ChainNotAdded");
        expect(error).toBeInstanceOf(EBORequestCreator_ChainNotAdded);
    });

    it("creates generic Error for unknown error name", () => {
        const error = ErrorFactory.createError("UnknownError");
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("Unknown error: UnknownError");
    });
});