export class CommandNotRun extends Error {
    constructor(commandName: string) {
        super(`Cannot undo ${commandName} as it was not run yet.`);

        this.name = "CommandNotRun";
    }
}
