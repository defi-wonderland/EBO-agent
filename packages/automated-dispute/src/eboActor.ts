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
     * Handle `RequestCreated` event.
     *
     * @param event `RequestCreated` event
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
        const response = await this.buildResponse(chainId);

        if (this.alreadyProposed(response.epoch, response.chainId, response.block)) return;

        try {
            await this.protocolProvider.proposeResponse(
                this.requestId,
                response.epoch,
                response.chainId,
                response.block,
            );
        } catch (err) {
            if (err instanceof ContractFunctionRevertedError) {
                this.logger.warn(
                    `Block ${response.block} for epoch ${response.epoch} and ` +
                        `chain ${response.chainId} was not proposed. Skipping proposal...`,
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
        const newResponse: Response["response"] = {
            epoch,
            chainId,
            block: blockNumber,
        };

        for (const [responseId, proposedResponse] of responses) {
            if (this.equalResponses(proposedResponse.response, newResponse)) {
                this.logger.info(
                    `Block ${blockNumber} for epoch ${epoch} and chain ${chainId} already proposed on response ${responseId}. Skipping...`,
                );

                return true;
            }
        }

        return false;
    }

    /**
     * Build a response body with an epoch, chain ID and block number.
     *
     * @param chainId chain ID to use in the response body
     * @returns a response body
     */
    private async buildResponse(chainId: Caip2ChainId): Promise<Response["response"]> {
        const { currentEpoch, currentEpochTimestamp } =
            await this.protocolProvider.getCurrentEpoch();

        const epochBlockNumber = await this.blockNumberService.getEpochBlockNumber(
            currentEpochTimestamp,
            chainId,
        );

        return {
            epoch: currentEpoch,
            chainId: chainId,
            block: epochBlockNumber,
        };
    }

    /**
     * Handle `ResponseProposed` event.
     *
     * @param event a `ResponseProposed` event
     * @returns void
     */
    public async onResponseProposed(event: EboEvent<"ResponseProposed">): Promise<void> {
        this.validateRequestPresent(event.metadata.requestId);

        this.registry.addResponse(event.metadata.responseId, event.metadata.response);

        const eventResponse = event.metadata.response.response;
        const actorResponse = await this.buildResponse(eventResponse.chainId);

        if (this.equalResponses(actorResponse, eventResponse)) {
            this.logger.info(`Response ${event.metadata.responseId} was validated. Skipping...`);

            return;
        }

        await this.protocolProvider.disputeResponse(
            event.metadata.requestId,
            event.metadata.responseId,
            event.metadata.response.proposer,
        );
    }

    /**
     * Check for deep equality between two responses
     *
     * @param a response
     * @param b response
     * @returns true if all attributes on `a` are equal to attributes on `b`, false otherwise
     */
    private equalResponses(a: Response["response"], b: Response["response"]) {
        if (a.block != b.block) return false;
        if (a.chainId != b.chainId) return false;
        if (a.epoch != b.epoch) return false;

        return true;
    }

    /**
     * Validate if the actor is handling the request.
     *
     * @param requestId request ID
     */
    private validateRequestPresent(requestId: string) {
        const request = this.registry.getRequest(requestId);

        if (!request) {
            this.logger.error(`The request ${requestId} is not handled by this actor.`);

            // We want to fail the actor as receiving events from other requests
            // will most likely cause a corrupted state.
            throw new InvalidActorState();
        }
    }

    public async onResponseDisputed(_event: EboEvent<"ResponseDisputed">): Promise<void> {
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
