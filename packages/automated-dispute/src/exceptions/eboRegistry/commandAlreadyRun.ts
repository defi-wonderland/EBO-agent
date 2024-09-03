export class CommandAlreadyRun extends Error {
    constructor(commandName: string) {
        super(`Command ${commandName} can only be run once.`);

        this.name = "CommandAlreadyRun";
    }
}
