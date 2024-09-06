import { CommandAlreadyRun, CommandNotRun } from "../../../exceptions/index.js";
import { EboRegistryCommand } from "../../../interfaces/index.js";

export class Noop implements EboRegistryCommand {
    private wasRun: boolean = false;

    private constructor() {}

    public static buildFromEvent(): Noop {
        return new Noop();
    }

    run(): void {
        if (this.wasRun) throw new CommandAlreadyRun(Noop.name);

        this.wasRun = true;
    }

    undo(): void {
        if (!this.wasRun) throw new CommandNotRun(Noop.name);
    }
}
