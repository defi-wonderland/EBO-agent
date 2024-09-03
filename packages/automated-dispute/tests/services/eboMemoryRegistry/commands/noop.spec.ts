import { describe, expect, it } from "vitest";

import { CommandAlreadyRun, CommandNotRun } from "../../../../src/exceptions/index.js";
import { Noop } from "../../../../src/services/index.js";

describe("Noop", () => {
    describe("run", () => {
        it("throws if the command was already run", () => {
            const command = Noop.buildFromEvent();

            command.run();

            expect(() => command.run()).toThrow(CommandAlreadyRun);
        });
    });

    describe("undo", () => {
        it("throws if undoing the command before being run", () => {
            const command = Noop.buildFromEvent();

            expect(() => command.undo()).toThrow(CommandNotRun);
        });
    });
});
