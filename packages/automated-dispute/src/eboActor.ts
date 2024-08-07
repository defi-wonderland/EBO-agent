import { BlockNumberService } from "@ebo-agent/blocknumber";

import { EboRegistry } from "./eboRegistry.js";
import { RequestMismatch } from "./exceptions/requestMismatch.js";
import { ProtocolProvider } from "./protocolProvider.js";
import { EboEvent } from "./types/events.js";
import { Dispute, Response } from "./types/prophet.js";

export class EboActor {
    private registry: EboRegistry;

    constructor(
        private readonly protocolProvider: ProtocolProvider,
        private readonly blockNumberService: BlockNumberService,
        private readonly requestId: string,
    ) {
        this.registry = new EboRegistry();
    }

    /**
     * Handle RequestCreated event.
     *
     * @param event RequestCreated event
     */
    public async onRequestCreated(event: EboEvent<"RequestCreated">): Promise<void> {
        if (event.metadata.requestId != this.requestId)
            throw new RequestMismatch(this.requestId, event.metadata.requestId);

        this.registry.addRequest(event.metadata.requestId, event.metadata.request);

        const { chainId } = event.metadata;
        const { currentEpoch, currentEpochTimestamp } =
            await this.protocolProvider.getCurrentEpoch();

        const epochBlockNumber = await this.blockNumberService.getEpochBlockNumber(
            currentEpochTimestamp,
            chainId,
        );

        await this.protocolProvider.proposeResponse(
            this.requestId,
            currentEpoch,
            chainId,
            epochBlockNumber,
        );
    }

    public async onResponseProposed(_event: EboEvent<"ResponseDisputed">): Promise<void> {
        // TODO: implement
        return;
    }

    public async onResponseDisputed(_event: EboEvent<"ResponseDisputed">): Promise<void> {
        // TODO: implement
        return;
    }

    private async proposeResponse(_response: Response): Promise<void> {
        // TODO: implement
        return;
    }

    private async disputeProposal(_dispute: Dispute): Promise<void> {
        // TODO: implement
        return;
    }

    private async isValidDispute(_dispute: Dispute): Promise<boolean> {
        // TODO: implement
        return true;
    }

    public async onFinalizeRequest(_event: EboEvent<"RequestFinalizable">): Promise<void> {
        // TODO: implement
        return;
    }

    public async onDisputeStatusChanged(_event: EboEvent<"DisputeStatusChanged">): Promise<void> {
        // TODO: implement
        return;
    }

    public async onDisputeEscalated(_event: EboEvent<"DisputeEscalated">): Promise<void> {
        // TODO: implement
        return;
    }
}
