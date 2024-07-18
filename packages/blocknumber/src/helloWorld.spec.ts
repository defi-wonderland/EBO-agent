import { describe, expect, it } from "vitest";

import foo from "./helloWorld";

describe("test", () => {
    it("pass", () => {
        const result = foo();

        expect(result).toBe("bar");
    });
});
