import { CommandAlreadyRun, CommandNotRun } from "../../../exceptions/index.js";
import { EboRegistry, EboRegistryCommand } from "../../../interfaces/index.js";
import { ProtocolProvider } from "../../../providers/index.js";
import { EboEvent, Request } from "../../../types/index.js";

export class AddRequest implements EboRegistryCommand {
    private wasRun: boolean = false;

    private constructor(
        private readonly registry: EboRegistry,
        private readonly request: Request,
    ) {}

    public static buildFromEvent(
        event: EboEvent<"RequestCreated">,
        registry: EboRegistry,
    ): AddRequest {
        // @ts-expect-error: must fetch request differently
        const eventRequest = event.metadata.request;
        const request: Request = {
            id: event.requestId,
            chainId: event.metadata.chainId,
            epoch: event.metadata.epoch,
            createdAt: event.blockNumber,
            decodedData: {
                disputeModuleData: ProtocolProvider.decodeRequestDisputeModuleData(
                    eventRequest.disputeModuleData,
                ),
                responseModuleData: ProtocolProvider.decodeRequestResponseModuleData(
                    eventRequest.responseModuleData,
                ),
            },
            // @ts-expect-error: must fetch request
            prophetData: event.metadata.request,
            status: "Active",
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
