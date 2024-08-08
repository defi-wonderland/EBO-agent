import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { ILogger } from "@ebo-agent/shared";
import { ContractFunctionRevertedError } from "viem";

import { InvalidActorState } from "./exceptions/invalidActorState.exception.js";
import { RequestMismatch } from "./exceptions/requestMismatch.js";
import { EboRegistry } from "./interfaces/eboRegistry.js";
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

        if (this.registry.getRequest(event.metadata.requestId)) {
            this.logger.error(
                `The request ${event.metadata.requestId} was already being handled by an actor.`,
            );

            throw new InvalidActorState();
        }

        this.registry.addRequest(event.metadata.requestId, event.metadata.request);

        if (this.anyActiveProposal()) {
            // Skipping new proposal until the actor receives a ResponseDisputed event;
            // at that moment, it will be possible to re-propose again.
            this.logger.info(
                `There is an active proposal for request ${this.requestId}. Skipping...`,
            );

            return;
        }

        const { chainId } = event.metadata;
        const { currentEpoch, currentEpochTimestamp } =
            await this.protocolProvider.getCurrentEpoch();

        const epochBlockNumber = await this.blockNumberService.getEpochBlockNumber(
            currentEpochTimestamp,
            chainId,
        );

        if (this.alreadyProposed(currentEpoch, chainId, epochBlockNumber)) return;

        try {
            await this.protocolProvider.proposeResponse(
                this.requestId,
                currentEpoch,
                chainId,
                epochBlockNumber,
            );
        } catch (err) {
            if (err instanceof ContractFunctionRevertedError) {
                this.logger.warn(
                    `Block ${epochBlockNumber} for epoch ${currentEpoch} and ` +
                        `chain ${chainId} was not proposed. Skipping proposal...`,
                );
            } else {
                this.logger.error(
                    `Actor handling request ${this.requestId} is not able to continue.`,
                );

                throw err;
            }
        }
    }

    /**
     * Check if there's at least one proposal that has not received any dispute yet.
     *
     * @returns
     */
    private anyActiveProposal() {
        // TODO: implement this function
        return false;
    }

    /**
     * Check if the same proposal has already been made in the past.
     *
     * @param epoch epoch of the request
     * @param chainId  chain id of the request
     * @param blockNumber proposed block number
     * @returns true if there's a registry of a proposal with the same attributes, false otherwise
     */
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
