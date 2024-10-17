import { describe, expect, it, vi } from "vitest";

import { HexUtils, InvalidHex } from "../../src/index.js";

describe("HexUtils", () => {
    describe("normalize", () => {
        it("normalizes a hex string", () => {
            const hex = "0xABCDEABCDEABCDEABCDEABCDEABCDEABCDEABCDEAB";
            const normalizedHex = HexUtils.normalize(hex);

            expect(normalizedHex).toEqual("0xabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeab");
        });

        it("throws if input is not a hex", () => {
            const notAHex = "foobar";

            expect(() => HexUtils.normalize(notAHex)).toThrow(InvalidHex);
        });
    });

    describe("isNormalized", () => {
        it("returns true if is a normalized hex", () => {
            const hex = "0xabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeab";

            expect(HexUtils.isNormalized(hex)).toBe(true);
        });

        it("returns false if is not a normalized hex", () => {
            const hex = "0xABCDEABCDEABCDEABCDEABCDEABCDEABCDEABCDEAB";

            expect(HexUtils.isNormalized(hex)).toBe(false);
        });

        it("returns false if input is not a hex", () => {
            const notAHex = "foobar";

            expect(HexUtils.isNormalized(notAHex)).toBe(false);
        });

        it("throws if there is an unhandled error", () => {
            const normalizeMock = vi.spyOn(HexUtils, "normalize").mockImplementation(() => {
                throw new Error();
            });

            expect(() => HexUtils.isNormalized("abc")).toThrow(Error);

            normalizeMock.mockRestore();
        });
    });
});
