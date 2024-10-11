import { CommandAlreadyRun, CommandNotRun } from "../../../exceptions/index.js";
import { EboRegistry, EboRegistryCommand } from "../../../interfaces/index.js";
import { Dispute, EboEvent } from "../../../types/index.js";

export class AddDispute implements EboRegistryCommand {
    private wasRun: boolean = false;

    private constructor(
        private readonly registry: EboRegistry,
        private readonly dispute: Dispute,
    ) {}

    public static buildFromEvent(
        event: EboEvent<"ResponseDisputed">,
        registry: EboRegistry,
    ): AddDispute {
        const dispute: Dispute = {
            id: event.metadata.disputeId,
            createdAt: {
                timestamp: event.timestamp,
                blockNumber: event.blockNumber,
                logIndex: event.logIndex,
            },
            status: "Active",
            prophetData: event.metadata.dispute,
        };

        return new AddDispute(registry, dispute);
    }

    run(): void {
        if (this.wasRun) throw new CommandAlreadyRun(AddDispute.name);

        this.registry.addDispute(this.dispute);
        this.wasRun = true;
    }

    undo(): void {
        if (!this.wasRun) throw new CommandNotRun(AddDispute.name);

        this.registry.removeDispute(this.dispute.id);
    }
}
