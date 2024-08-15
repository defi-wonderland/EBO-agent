import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { ILogger } from "@ebo-agent/shared";
import { ContractFunctionRevertedError } from "viem";

import { InvalidActorState } from "./exceptions/invalidActorState.exception.js";
import { InvalidDisputeStatus } from "./exceptions/invalidDisputeStatus.exception.js";
import { RequestMismatch } from "./exceptions/requestMismatch.js";
import { ResponseAlreadyProposed } from "./exceptions/responseAlreadyProposed.js";
import { EboRegistry } from "./interfaces/eboRegistry.js";
import { ProtocolProvider } from "./protocolProvider.js";
import { EboEvent } from "./types/events.js";
import { Dispute, Request, Response, ResponseBody } from "./types/prophet.js";

type OnTerminateActorCallback = (request: Request) => Promise<void>;

/**
 * Actor that handles a singular Prophet's request asking for the block number that corresponds
 * to an instant on an indexed chain.
 */
export class EboActor {
    /**
     * Creates an `EboActor` instance.
     *
     * @param actorRequest.id request ID this actor will handle
     * @param actorRequest.epoch requested epoch
     * @param actorRequest.epoch requested epoch's timestamp
     * @param onTerminate callback to be run when this instance is being terminated
     * @param protocolProvider a `ProtocolProvider` instance
     * @param blockNumberService a `BlockNumberService` instance
     * @param registry an `EboRegistry` instance
     * @param logger an `ILogger` instance
     */
    constructor(
        private readonly actorRequest: {
            id: string;
            epoch: bigint;
            epochTimestamp: bigint;
        },
        private readonly onTerminate: OnTerminateActorCallback,
        private readonly protocolProvider: ProtocolProvider,
        private readonly blockNumberService: BlockNumberService,
        private readonly registry: EboRegistry,
        private readonly logger: ILogger,
    ) {}

    /**
     * Handle `RequestCreated` event.
     *
     * @param event `RequestCreated` event
     */
    public async onRequestCreated(event: EboEvent<"RequestCreated">): Promise<void> {
        if (event.metadata.requestId != this.actorRequest.id)
            throw new RequestMismatch(this.actorRequest.id, event.metadata.requestId);

        if (this.registry.getRequest(event.metadata.requestId)) {
            this.logger.error(
                `The request ${event.metadata.requestId} was already being handled by an actor.`,
            );

            throw new InvalidActorState();
        }

        const request: Request = {
            id: this.actorRequest.id,
            chainId: event.metadata.chainId,
            epoch: this.actorRequest.epoch,
            epochTimestamp: this.actorRequest.epochTimestamp,
            createdAt: event.blockNumber,
            prophetData: event.metadata.request,
        };

        this.registry.addRequest(event.metadata.requestId, request);

        if (this.anyActiveProposal()) {
            // Skipping new proposal until the actor receives a ResponseDisputed event;
            // at that moment, it will be possible to re-propose again.
            this.logger.info(
                `There is an active proposal for request ${this.actorRequest.id}. Skipping...`,
            );

            return;
        }

        const { chainId } = event.metadata;

        try {
            await this.proposeResponse(chainId);
        } catch (err) {
            if (err instanceof ResponseAlreadyProposed) this.logger.info(err.message);
            else throw err;
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
        const newResponse: ResponseBody = {
            epoch,
            chainId,
            block: blockNumber,
        };

        for (const [responseId, proposedResponse] of responses) {
            const proposedBody = proposedResponse.prophetData.response;

            if (this.equalResponses(proposedBody, newResponse)) {
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
    private async buildResponse(chainId: Caip2ChainId): Promise<ResponseBody> {
        const epochBlockNumber = await this.blockNumberService.getEpochBlockNumber(
            this.actorRequest.epochTimestamp,
            chainId,
        );

        return {
            epoch: this.actorRequest.epoch,
            chainId: chainId,
            block: epochBlockNumber,
        };
    }

    /**
     * Propose an actor request's response for a particular chain.
     *
     * @param chainId the CAIP-2 compliant chain ID
     */
    private async proposeResponse(chainId: Caip2ChainId): Promise<void> {
        const response = await this.buildResponse(chainId);

        if (this.alreadyProposed(response.epoch, response.chainId, response.block)) {
            throw new ResponseAlreadyProposed(response);
        }

        try {
            await this.protocolProvider.proposeResponse(
                this.actorRequest.id,
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
                    `Actor handling request ${this.actorRequest.id} is not able to continue.`,
                );

                throw err;
            }
        }
    }

    /**
     * Handle `ResponseProposed` event.
     *
     * @param event a `ResponseProposed` event
     * @returns void
     */
    public async onResponseProposed(event: EboEvent<"ResponseProposed">): Promise<void> {
        this.shouldHandleRequest(event.metadata.requestId);

        const response: Response = {
            id: event.metadata.responseId,
            wasDisputed: false, // All responses are created undisputed
            prophetData: event.metadata.response,
        };

        this.registry.addResponse(event.metadata.responseId, response);

        const eventResponse = event.metadata.response;
        const actorResponse = await this.buildResponse(eventResponse.response.chainId);

        if (this.equalResponses(actorResponse, eventResponse.response)) {
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
    private equalResponses(a: ResponseBody, b: ResponseBody) {
        if (a.block != b.block) return false;
        if (a.chainId != b.chainId) return false;
        if (a.epoch != b.epoch) return false;

        return true;
    }

    /**
     * Validate that the actor should handle the request by its ID.
     *
     * @param requestId request ID
     */
    private shouldHandleRequest(requestId: string) {
        if (this.actorRequest.id.toLowerCase() !== requestId.toLowerCase()) {
            this.logger.error(`The request ${requestId} is not handled by this actor.`);

            // We want to fail the actor as receiving events from other requests
            // will most likely cause a corrupted state.
            throw new InvalidActorState();
        }
    }

    /**
     * Returns the active actor request.
     *
     * @throws {InvalidActorState} when the request has not been added to the registry yet.
     * @returns the actor `Request`
     */
    private getActorRequest() {
        const request = this.registry.getRequest(this.actorRequest.id);

        if (request === undefined) throw new InvalidActorState();

        return request;
    }

    /**
     * Handle the `ResponseDisputed` event.
     *
     * @param event `ResponseDisputed` event.
     */
    public async onResponseDisputed(event: EboEvent<"ResponseDisputed">): Promise<void> {
        this.shouldHandleRequest(event.metadata.dispute.requestId);

        const dispute: Dispute = {
            id: event.metadata.disputeId,
            status: "Active",
            prophetData: event.metadata.dispute,
        };

        this.registry.addDispute(event.metadata.disputeId, dispute);

        const request = this.getActorRequest();
        const proposedResponse = this.registry.getResponse(event.metadata.responseId);

        if (!proposedResponse) throw new InvalidActorState();

        const isValidDispute = await this.isValidDispute(proposedResponse);

        if (isValidDispute) await this.pledgeFor(request, dispute);
        else await this.pledgeAgainst(request, dispute);
    }

    /**
     * Check if a dispute is valid, comparing the already submitted and disputed proposal with
     * the response this actor would propose.
     *
     * @param proposedResponse the already submitted response
     * @returns true if the hypothetical proposal is different that the submitted one, false otherwise
     */
    private async isValidDispute(proposedResponse: Response) {
        const actorResponse = await this.buildResponse(
            proposedResponse.prophetData.response.chainId,
        );

        const equalResponses = this.equalResponses(
            actorResponse,
            proposedResponse.prophetData.response,
        );

        return !equalResponses;
    }

    /**
     * Pledge in favor of the dispute.
     *
     * @param request the dispute's `Request`
     * @param dispute the `Dispute`
     */
    private async pledgeFor(request: Request, dispute: Dispute) {
        try {
            this.logger.info(`Pledging against dispute ${dispute.id}`);

            await this.protocolProvider.pledgeForDispute(request.prophetData, dispute.prophetData);
        } catch (err) {
            if (err instanceof ContractFunctionRevertedError) {
                // TODO: handle each error appropriately
                this.logger.warn(`Pledging for dispute ${dispute.id} was reverted. Skipping...`);
            } else {
                // TODO: handle each error appropriately
                this.logger.error(
                    `Actor handling request ${this.actorRequest.id} is not able to continue.`,
                );

                throw err;
            }
        }
    }

    /**
     * Pledge against the dispute.
     *
     * @param request the dispute's `Request`
     * @param dispute the `Dispute`
     */
    private async pledgeAgainst(request: Request, dispute: Dispute) {
        try {
            this.logger.info(`Pledging for dispute ${dispute.id}`);

            await this.protocolProvider.pledgeAgainstDispute(
                request.prophetData,
                dispute.prophetData,
            );
        } catch (err) {
            if (err instanceof ContractFunctionRevertedError) {
                // TODO: handle each error appropriately
                this.logger.warn(`Pledging on dispute ${dispute.id} was reverted. Skipping...`);
            } else {
                // TODO: handle each error appropriately
                this.logger.error(
                    `Actor handling request ${this.actorRequest.id} is not able to continue.`,
                );

                throw err;
            }
        }
    }

    /**
     * Handle the `DisputeStatusChanged` event.
     *
     * @param event `DisputeStatusChanged` event
     */
    public async onDisputeStatusChanged(event: EboEvent<"DisputeStatusChanged">): Promise<void> {
        const requestId = event.metadata.dispute.requestId;

        this.shouldHandleRequest(requestId);

        const request = this.getActorRequest();
        const disputeId = event.metadata.disputeId;
        const disputeStatus = event.metadata.status;

        this.registry.updateDisputeStatus(disputeId, disputeStatus);

        this.logger.info(`Dispute ${disputeId} status changed to ${disputeStatus}.`);

        switch (disputeStatus) {
            case "None":
                this.logger.warn(
                    `Agent does not know how to handle status changing to 'None' on dispute ${disputeId}.`,
                );

                break;

            case "Active": // Case handled by ResponseDisputed
            case "Lost": // Relevant during periodic request state checks
            case "Won": // Relevant during periodic request state checks
                break;

            case "Escalated":
                await this.onDisputeEscalated(disputeId, request);

                break;

            case "NoResolution":
                await this.onDisputeWithNoResolution(disputeId, request);

                break;

            default:
                throw new InvalidDisputeStatus(disputeId, disputeStatus);
        }
    }

    private async onDisputeEscalated(disputeId: string, request: Request) {
        // TODO: notify

        await this.onTerminate(request);
    }

    private async onDisputeWithNoResolution(disputeId: string, request: Request) {
        try {
            await this.proposeResponse(request.chainId);
        } catch (err) {
            if (err instanceof ResponseAlreadyProposed) {
                // This is an extremely weird case. If no other agent proposes
                // a different response, the request will probably be finalized
                // with no valid response.
                //
                // This actor will just wait until the proposal window ends.
                this.logger.warn(err.message);

                // TODO: notify
            } else {
                this.logger.error(
                    `Could not handle dispute ${disputeId} changing to NoResolution status.`,
                );

                throw err;
            }
        }
    }

    /**
     * Handle the `ResponseFinalized` event.
     *
     * @param event `ResponseFinalized` event
     */
    public async onRequestFinalized(event: EboEvent<"RequestFinalized">): Promise<void> {
        this.shouldHandleRequest(event.metadata.requestId);

        const request = this.getActorRequest();

        await this.onTerminate(request);
    }
}
