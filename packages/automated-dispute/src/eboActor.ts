import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { ILogger } from "@ebo-agent/shared";

import { EboRegistry } from "./eboRegistry.js";
import { RequestMismatch } from "./exceptions/requestMismatch.js";
import { ProtocolProvider } from "./protocolProvider.js";
import { EboEvent } from "./types/events.js";
import { Dispute, Response } from "./types/prophet.js";

export class EboActor {
    constructor(
        private readonly protocolProvider: ProtocolProvider,
        private readonly blockNumberService: BlockNumberService,
        private readonly registry: EboRegistry,
        private readonly requestId: string,
        private readonly logger: ILogger,
    ) {}

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

        if (this.alreadyProposed(currentEpoch, chainId, epochBlockNumber)) {
            return;
        }

        await this.protocolProvider.proposeResponse(
            this.requestId,
            currentEpoch,
            chainId,
            epochBlockNumber,
        );
    }

    private alreadyProposed(epoch: bigint, chainId: Caip2ChainId, blockNumber: bigint) {
        const responses = this.registry.getResponses();

        for (const [responseId, response] of responses) {
            if (response.response.block != blockNumber) continue;
            if (response.response.chainId != chainId) continue;
            if (response.response.epoch != epoch) continue;

            this.logger.info(
                `Block ${blockNumber} for epoch ${epoch} and chain ${chainId} already proposed on response ${responseId}. Skipping...`,
            );

            return true;
        }

        return false;
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
