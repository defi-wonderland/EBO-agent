import { CommandAlreadyRun, CommandNotRun } from "../../../exceptions/index.js";
import { EboRegistry, EboRegistryCommand } from "../../../interfaces/index.js";
import { EboEvent, Request } from "../../../types/index.js";

export class AddRequest implements EboRegistryCommand {
    private wasRun: boolean = false;

    constructor(
        private readonly registry: EboRegistry,
        private readonly request: Request,
    ) {}

    public static build(
        event: EboEvent<"RequestCreated">,
        registry: EboRegistry,
        epoch: bigint,
    ): AddRequest {
        const request: Request = {
            id: event.requestId,
            chainId: event.metadata.chainId,
            epoch: epoch,
            createdAt: event.blockNumber,
            prophetData: event.metadata.request,
        };

        return new AddRequest(registry, request);
    }

    run(): void {
        if (this.wasRun) throw new CommandAlreadyRun(AddRequest.name);

        this.registry.addRequest(this.request);
        this.wasRun = true;
    }

    undo(): void {
        if (!this.wasRun) throw new CommandNotRun(AddRequest.name);

        this.registry.removeRequest(this.request.id);
    }
}
