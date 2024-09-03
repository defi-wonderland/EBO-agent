import { CommandAlreadyRun, CommandNotRun, DisputeNotFound } from "../../../exceptions/index.js";
import { EboRegistry, EboRegistryCommand } from "../../../interfaces/index.js";
import { DisputeStatus, EboEvent } from "../../../types/index.js";

export class UpdateDisputeStatus implements EboRegistryCommand {
    private wasRun: boolean = false;
    private previousStatus?: DisputeStatus;

    private constructor(
        private readonly registry: EboRegistry,
        private readonly disputeId: string,
        private readonly status: DisputeStatus,
    ) {}

    public static buildFromEvent(
        event: EboEvent<"DisputeStatusChanged">,
        registry: EboRegistry,
    ): UpdateDisputeStatus {
        const disputeId = event.metadata.disputeId;
        const status = event.metadata.status;

        return new UpdateDisputeStatus(registry, disputeId, status);
    }

    run(): void {
        if (this.wasRun) throw new CommandAlreadyRun(UpdateDisputeStatus.name);

        const dispute = this.registry.getDispute(this.disputeId);

        if (!dispute) throw new DisputeNotFound(this.disputeId);

        this.previousStatus = dispute.status;

        this.registry.updateDisputeStatus(this.disputeId, this.status);

        this.wasRun = true;
    }

    undo(): void {
        if (!this.wasRun || !this.previousStatus) throw new CommandNotRun(UpdateDisputeStatus.name);

        this.registry.updateDisputeStatus(this.disputeId, this.previousStatus);
    }
}
