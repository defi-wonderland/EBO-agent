import { Address } from "@ebo-agent/shared";

import { CommandAlreadyRun, CommandNotRun } from "../../../exceptions/index.js";
import { EboRegistry, EboRegistryCommand } from "../../../interfaces/index.js";
import { ProtocolProvider } from "../../../providers/index.js";
import { EboEvent, Response, ResponseBody, ResponseId } from "../../../types/index.js";

export class AddResponse implements EboRegistryCommand {
    private wasRun: boolean = false;

    private constructor(
        private readonly registry: EboRegistry,
        private readonly response: Response,
    ) {}

    static buildFromEvent(event: EboEvent<"ResponseProposed">, registry: EboRegistry) {
        const encodedResponse = event.metadata.response.response;
        const responseBody: ResponseBody = ProtocolProvider.decodeResponse(encodedResponse);

        const response: Response = {
            id: Address.normalize(event.metadata.responseId) as ResponseId,
            createdAt: {
                timestamp: event.timestamp,
                blockNumber: event.blockNumber,
                logIndex: event.logIndex,
            },
            decodedData: {
                response: responseBody,
            },
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
