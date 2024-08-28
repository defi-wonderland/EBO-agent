import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/dist/types.js";
import { ILogger } from "@ebo-agent/shared";
import { ContractFunctionRevertedError } from "viem";

import { DisputeWithoutResponse } from "./exceptions/eboActor/disputeWithoutResponse.exception.js";
import {
    InvalidActorState,
    InvalidDisputeStatus,
    RequestMismatch,
    ResponseAlreadyProposed,
} from "./exceptions/index.js";
import { EboRegistry } from "./interfaces/eboRegistry.js";
import { ProtocolProvider } from "./protocolProvider.js";
import { EboEvent, EboEventName } from "./types/events.js";
import { Dispute, Request, RequestId, Response, ResponseBody } from "./types/prophet.js";

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
            id: RequestId;
            epoch: bigint;
            epochTimestamp: bigint;
        },
        private readonly protocolProvider: ProtocolProvider,
        private readonly blockNumberService: BlockNumberService,
        private readonly registry: EboRegistry,
        private readonly logger: ILogger,
    ) {}

    /**
     * Update internal state for Request, Response and Dispute instances.
     *
     * @param _event EBO event
     */
    public updateState(_event: EboEvent<EboEventName>) {
        // TODO
        throw new Error("Implement me");
    }

    /**
     * Handle a new event and triggers reactive interactions with smart contracts.
     *
     * A basic example would be reacting to a new request by proposing a response.
     *
     * @param _event EBO event
     */
    public onNewEvent(_event: EboEvent<EboEventName>) {
        // TODO
        throw new Error("Implement me");
    }

    /**
     * Triggers time-based interactions with smart contracts. This handles window-based
     * checks like proposal windows to close requests, or dispute windows to accept responses.
     *
     * @param blockNumber block number to check open/closed windows
     */
    public async onLastBlockUpdated(blockNumber: bigint): Promise<void> {
        await this.settleDisputes(blockNumber);

        const request = this.getActorRequest();
        const proposalDeadline = request.prophetData.responseModuleData.deadline;
        const isProposalWindowOpen = blockNumber <= proposalDeadline;

        if (isProposalWindowOpen) {
            this.logger.debug(`Proposal window for request ${request.id} not closed yet.`);

            return;
        }

        const acceptedResponse = this.getAcceptedResponse(blockNumber);

        if (acceptedResponse) {
            this.logger.info(`Finalizing request ${request.id}...`);

            await this.protocolProvider.finalize(request.prophetData, acceptedResponse.prophetData);
        }

        // TODO: check for responseModuleData.deadline, if no answer has been accepted after the deadline
        //  notify and (TBD) finalize with no response
    }

    private async settleDisputes(blockNumber: bigint): Promise<void> {
        const request = this.getActorRequest();
        const disputes: Dispute[] = this.getActiveDisputes();

        const settledDisputes = disputes.map(async (dispute) => {
            const responseId = dispute.prophetData.responseId;
            const response = this.registry.getResponse(responseId);

            if (!response) {
                this.logger.error(
                    `While trying to settle dispute ${dispute.id} its response with` +
                        `id ${dispute.prophetData.responseId} was not found in the registry.`,
                );

                throw new DisputeWithoutResponse(dispute);
            }

            if (this.canBeSettled(request, dispute, blockNumber)) {
                await this.settleDispute(request, response, dispute);
            }
        });

        // Any of the disputes not being handled correctly should make the actor fail
        await Promise.all(settledDisputes);
    }

    private getActiveDisputes(): Dispute[] {
        const disputes = this.registry.getDisputes();

        return disputes.filter((dispute) => dispute.status === "Active");
    }

    // TODO: extract this into another service
    private canBeSettled(request: Request, dispute: Dispute, blockNumber: bigint): boolean {
        if (dispute.status !== "Active") return false;

        const { bondEscalationDeadline, tyingBuffer } = request.prophetData.disputeModuleData;
        const deadline = bondEscalationDeadline + tyingBuffer;

        return blockNumber > deadline;
    }

    private settleDispute(request: Request, response: Response, dispute: Dispute) {
        return Promise.resolve()
            .then(async () => {
                this.logger.info(`Settling dispute ${dispute.id}...`);

                await this.protocolProvider.settleDispute(
                    request.prophetData,
                    response.prophetData,
                    dispute.prophetData,
                );

                this.logger.info(`Dispute ${dispute.id} settled.`);
            })
            .catch(async (err) => {
                this.logger.warn(`Dispute ${dispute.id} was not settled.`);

                if (!(err instanceof ContractFunctionRevertedError)) throw err;

                this.logger.warn(`Call reverted for ${dispute.id} due to: ${err.data?.errorName}`);

                if (err.data?.errorName === "BondEscalationModule_ShouldBeEscalated") {
                    this.logger.warn(`Escalating dispute ${dispute.id}...`);

                    await this.protocolProvider.escalateDispute(
                        request.prophetData,
                        response.prophetData,
                        dispute.prophetData,
                    );

                    // TODO: notify

                    this.logger.warn(`Dispute ${dispute.id} was escalated.`);
                }
            })
            .catch((err) => {
                this.logger.error(`Failed to escalate dispute ${dispute.id}.`);

                // TODO: notify

                throw err;
            });
    }

    /**
     * Gets the first accepted response based on its creation timestamp
     *
     * @param blockNumber current block number
     * @returns a `Response` instance if any accepted, otherwise `undefined`
     */
    private getAcceptedResponse(blockNumber: bigint): Response | undefined {
        const responses = this.registry.getResponses();
        const acceptedResponses = responses.filter((response) =>
            this.isResponseAccepted(response, blockNumber),
        );

        return acceptedResponses.sort((a, b) => {
            if (a.createdAt < b.createdAt) return -1;
            if (a.createdAt > b.createdAt) return 1;

            return 0;
        })[0];
    }

    // TODO: refactor outside this module
    private isResponseAccepted(response: Response, blockNumber: bigint) {
        const request = this.getActorRequest();
        const dispute = this.registry.getResponseDispute(response);
        const disputeWindow =
            response.createdAt + request.prophetData.responseModuleData.disputeWindow;

        // Response is still able to be disputed
        if (blockNumber <= disputeWindow) return false;

        return dispute ? dispute.status === "Lost" : true;
    }

    /**
     * Check for all entities to be settled (ie their status is not changeable by this system), e.g.:
     * * Dispute status is `Lost`, `Won` or `NoResolution`
     * * Response cannot be disputed anymore and its disputes have been settled
     * * Request has at least one accepted response
     *
     * Be aware that a request can be finalized but some of its disputes can still be pending resolution.
     *
     * @returns `true` if all entities are settled, otherwise `false`
     */
    public canBeTerminated(): boolean {
        // TODO
        throw new Error("Implement me");
    }

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

        for (const proposedResponse of responses) {
            const responseId = proposedResponse.id;
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
            createdAt: event.blockNumber,
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
            createdAt: event.blockNumber,
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
        this.logger.info(`Dispute ${disputeId} for request ${request.id} has been escalated.`);
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

        this.logger.info(`Request ${request.id} has been finalized.`);
    }
}
