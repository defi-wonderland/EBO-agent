import { UnsupportedChain } from "@ebo-agent/blocknumber";
import { Caip2Utils } from "@ebo-agent/shared";

import { CommandAlreadyRun, CommandNotRun } from "../../../exceptions/index.js";
import { EboRegistry, EboRegistryCommand } from "../../../interfaces/index.js";
import { EboEvent, Request } from "../../../types/index.js";
import { ProphetCodec } from "../../prophetCodec.js";

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
        const eventRequest = event.metadata.request;

        const requestModuleData = ProphetCodec.decodeRequestRequestModuleData(
            eventRequest.requestModuleData,
        );

        const responseModuleData = ProphetCodec.decodeRequestResponseModuleData(
            eventRequest.responseModuleData,
        );

        const disputeModuleData = ProphetCodec.decodeRequestDisputeModuleData(
            eventRequest.disputeModuleData,
        );

        const { chainId } = requestModuleData;

        if (!Caip2Utils.isSupported(chainId)) throw new UnsupportedChain(chainId);

        const request: Request = {
            id: event.requestId,
            createdAt: {
                timestamp: event.timestamp,
                blockNumber: event.blockNumber,
                logIndex: event.logIndex,
            },
            decodedData: {
                requestModuleData,
                responseModuleData,
                disputeModuleData,
            },
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
