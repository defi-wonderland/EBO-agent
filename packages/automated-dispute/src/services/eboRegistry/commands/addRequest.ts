import { UnsupportedChain } from "@ebo-agent/blocknumber";
import { Caip2Utils, EBO_SUPPORTED_CHAIN_IDS } from "@ebo-agent/shared";

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
        const chainId = Caip2Utils.findByHash(event.metadata.chainId, EBO_SUPPORTED_CHAIN_IDS);

        if (chainId === undefined) throw new UnsupportedChain(event.metadata.chainId);

        const request: Request = {
            id: event.requestId,
            // TODO: move chainId and epoch into decodedData + add request property to it
            chainId: chainId,
            epoch: event.metadata.epoch,
            createdAt: {
                timestamp: event.timestamp,
                blockNumber: event.blockNumber,
                logIndex: event.logIndex,
            },
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
