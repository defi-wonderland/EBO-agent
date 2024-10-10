import { CommandAlreadyRun, CommandNotRun, RequestNotFound } from "../../../exceptions/index.js";
import { EboRegistry, EboRegistryCommand } from "../../../interfaces/index.js";
import { EboEvent, Request, RequestStatus } from "../../../types/index.js";

export class FinalizeRequest implements EboRegistryCommand {
    private wasRun: boolean = false;
    private previousStatus?: RequestStatus;

    private constructor(
        private readonly registry: EboRegistry,
        private readonly request: Request,
    ) {}

    public static buildFromEvent(
        event: EboEvent<"OracleRequestFinalized">,
        registry: EboRegistry,
    ): FinalizeRequest {
        const requestId = event.metadata.requestId;
        const request = registry.getRequest(requestId);

        if (!request) throw new RequestNotFound(requestId);

        return new FinalizeRequest(registry, request);
    }

    run(): void {
        if (this.wasRun) throw new CommandAlreadyRun(FinalizeRequest.name);

        this.previousStatus = this.request.status;

        this.registry.updateRequestStatus(this.request.id, "Finalized");

        this.wasRun = true;
    }

    undo(): void {
        if (!this.wasRun || !this.previousStatus) throw new CommandNotRun(FinalizeRequest.name);

        this.registry.updateRequestStatus(this.request.id, this.previousStatus);
    }
}
