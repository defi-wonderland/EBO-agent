import { CommandAlreadyRun, CommandNotRun } from "../../../exceptions/index.js";
import { EboRegistry, EboRegistryCommand } from "../../../interfaces/index.js";
import { EboEvent, Response } from "../../../types/index.js";

export class AddResponse implements EboRegistryCommand {
    private wasRun: boolean = false;

    private constructor(
        private readonly registry: EboRegistry,
        private readonly response: Response,
    ) {}

    static buildFromEvent(event: EboEvent<"ResponseProposed">, registry: EboRegistry) {
        const response: Response = {
            id: event.metadata.responseId,
            wasDisputed: false, // All responses are created undisputed
            prophetData: event.metadata.response,
        };

        return new AddResponse(registry, response);
    }

    run(): void {
        if (this.wasRun) throw new CommandAlreadyRun(AddResponse.name);

        this.registry.addResponse(this.response);
        this.wasRun = true;
    }

    undo(): void {
        if (!this.wasRun) throw new CommandNotRun(AddResponse.name);

        this.registry.removeResponse(this.response.id);
    }
}
