import { describe, expect, it, vi } from "vitest";

import { Address, InvalidAddress } from "../../src/index.js";

describe("address", () => {
    describe("normalize", () => {
        it("normalizes an address", () => {
            const address = "0xABCDEABCDEABCDEABCDEABCDEABCDEABCDEABCDEAB";
            const normalizedAddress = Address.normalize(address);

            expect(normalizedAddress).toEqual("0xabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeab");
        });

        it("throws if input is not an address", () => {
            const notAnAddress = "foobar";

            expect(() => Address.normalize(notAnAddress)).toThrow(InvalidAddress);
        });
    });

    describe("isNormalized", () => {
        it("returns true if is a normalized address", () => {
            const address = "0xabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeab";

            expect(Address.isNormalized(address)).toBe(true);
        });

        it("returns false if is not a normalized address", () => {
            const address = "0xABCDEABCDEABCDEABCDEABCDEABCDEABCDEABCDEAB";

            expect(Address.isNormalized(address)).toBe(false);
        });

        it("returns false if input is not an address", () => {
            const notAnAddress = "foobar";

            expect(Address.isNormalized(notAnAddress)).toBe(false);
        });

        it("throws if there is an unhandled error", () => {
            const normalizeMock = vi.spyOn(Address, "normalize").mockImplementation(() => {
                throw new Error();
            });

            expect(() => Address.isNormalized("abc")).toThrow(Error);

            normalizeMock.mockRestore();
        });
    });
});
