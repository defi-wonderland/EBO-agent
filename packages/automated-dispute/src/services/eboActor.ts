import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/src/index.js";
import { Address, ILogger } from "@ebo-agent/shared";
import { Mutex } from "async-mutex";
import { Heap } from "heap-js";
import { BlockNumber, ContractFunctionRevertedError } from "viem";

import type {
    Dispute,
    DisputeStatus,
    EboEvent,
    EboEventName,
    Epoch,
    ErrorContext,
    Request,
    Response,
    ResponseBody,
    ResponseId,
} from "../types/index.js";
import { ErrorHandler } from "../exceptions/errorHandler.js";
import {
    CustomContractError,
    DisputeWithoutResponse,
    ErrorFactory,
    InvalidActorState,
    InvalidDisputeStatus,
    PastEventEnqueueError,
    RequestMismatch,
    ResponseAlreadyProposed,
    ResponseNotFound,
    UnknownEvent,
} from "../exceptions/index.js";
import { EboRegistry, EboRegistryCommand } from "../interfaces/index.js";
import { ProtocolProvider } from "../providers/index.js";
import {
    AddDispute,
    AddRequest,
    AddResponse,
    FinalizeRequest,
    UpdateDisputeStatus,
} from "../services/index.js";
import { ActorRequest } from "../types/actorRequest.js";

/**
 * Compare function to sort events chronologically in ascending order by block number
 * and log index.
 *
 * @param e1 EBO event
 * @param e2 EBO event
 * @returns 1 if `e2` is older than `e1`, -1 if `e1` is older than `e2`, 0 otherwise
 */
const EBO_EVENT_COMPARATOR = (e1: EboEvent<EboEventName>, e2: EboEvent<EboEventName>) => {
    if (e1.blockNumber > e2.blockNumber) return 1;
    if (e1.blockNumber < e2.blockNumber) return -1;

    return e1.logIndex - e2.logIndex;
};

/** Response properties needed to check response equality */
type EqualResponseParameters = {
    prophetData: Pick<Response["prophetData"], "requestId">;
    decodedData: Response["decodedData"];
};

/**
 * Actor that handles a singular Prophet's request asking for the block number that corresponds
 * to an instant on an indexed chain.
 */
export class EboActor {
    /**
     * Events queue that keeps the pending events to be processed.
     *
     * **NOTE**: the only place where `pop` should be called for the queue is during
     * `processEvents`
     */
    private readonly eventsQueue: Heap<EboEvent<EboEventName>>;
    private lastEventProcessed: EboEvent<EboEventName> | undefined;

    /**
     * Creates an `EboActor` instance.
     *
     * @param actorRequest.id request ID this actor will handle
     * @param actorRequest.epoch requested epoch
     * @param protocolProvider a `ProtocolProvider` instance
     * @param blockNumberService a `BlockNumberService` instance
     * @param registry an `EboRegistry` instance
     * @param logger an `ILogger` instance
     */
    constructor(
        public readonly actorRequest: ActorRequest,
        private readonly protocolProvider: ProtocolProvider,
        private readonly blockNumberService: BlockNumberService,
        private readonly registry: EboRegistry,
        private readonly eventProcessingMutex: Mutex,
        private readonly logger: ILogger,
    ) {
        this.eventsQueue = new Heap(EBO_EVENT_COMPARATOR);
    }

    /**
     * Enqueue events to be processed by the actor.
     *
     * @param event EBO event
     */
    public enqueue(event: EboEvent<EboEventName>): void {
        if (!this.shouldHandleRequest(event.requestId)) {
            this.logger.error(`The request ${event.requestId} is not handled by this actor.`);

            throw new RequestMismatch(this.actorRequest.id, event.requestId);
        }

        if (this.lastEventProcessed) {
            const isPastEvent = EBO_EVENT_COMPARATOR(this.lastEventProcessed, event) >= 0;

            if (isPastEvent) throw new PastEventEnqueueError(this.lastEventProcessed, event);
        }

        this.eventsQueue.push(event);
    }

    /**
     * Process all enqueued events synchronously and sequentially, based on their block numbers.
     *
     * The processing will update the internal state of the actor and, if the event is the most
     * recent one, it will try to react to it by interacting with the protocol smart contracts.
     *
     * An error thrown after updating the internal state will cause a rollback for the internal
     * state update and will keep the not-processed yet events, so those can be retried in the
     * future, where there are two scenarios:
     *
     * 1) New events were fetched, the failing event was handled by another agent and event
     *      processing resumes.
     * 2) No new events were fetched, the failing event processing will be retried until it
     *      succeeds, new events are fetched or the actor expires.
     *
     * The actor is supposed to process the events until the request expires somehow.
     *
     * @throws {RequestMismatch} when an event from another request was enqueued in this actor
     */
    public processEvents(): Promise<void> {
        return this.eventProcessingMutex.runExclusive(async () => {
            let event: EboEvent<EboEventName> | undefined;

            while ((event = this.eventsQueue.pop())) {
                this.lastEventProcessed = event;

                const updateStateCommand = this.buildUpdateStateCommand(event);

                updateStateCommand.run();

                try {
                    if (this.eventsQueue.isEmpty()) {
                        // `event` is the last and most recent event thus
                        // it needs to run some RPCs to keep Prophet's flow going on
                        await this.onLastEvent(event);
                    }
                } catch (err) {
                    this.logger.error(`Error processing event ${event.name}: ${err}`);

                    if (err instanceof CustomContractError) {
                        err.setProcessEventsContext(
                            event,
                            () => {
                                this.eventsQueue.push(event!);
                                updateStateCommand.undo();
                            },
                            () => {
                                throw err;
                            },
                        );

                        await ErrorHandler.handle(err, this.logger);

                        if (err.strategy.shouldNotify) {
                            // TODO: add notification logic
                            continue;
                        }
                        return;
                    } else {
                        throw err;
                    }
                }
            }
        });
    }

    /**
     * Update internal state for Request, Response and Dispute instances.
     *
     * TODO: move to a Factory and use it as EboActor dependency, right now we have to mock
     *  this private method which is eww
     *
     * @param _event EBO event
     */
    private buildUpdateStateCommand(event: EboEvent<EboEventName>): EboRegistryCommand {
        switch (event.name) {
            case "RequestCreated":
                return AddRequest.buildFromEvent(
                    event as EboEvent<"RequestCreated">,
                    this.registry,
                );

            case "ResponseProposed":
                return AddResponse.buildFromEvent(
                    event as EboEvent<"ResponseProposed">,
                    this.registry,
                );

            case "ResponseDisputed":
                return AddDispute.buildFromEvent(
                    event as EboEvent<"ResponseDisputed">,
                    this.registry,
                );

            case "DisputeStatusChanged":
                return UpdateDisputeStatus.buildFromEvent(
                    event as EboEvent<"DisputeStatusChanged">,
                    this.registry,
                );

            case "DisputeEscalated":
                return UpdateDisputeStatus.buildFromEvent(
                    event as EboEvent<"DisputeEscalated">,
                    this.registry,
                );

            case "RequestFinalized":
                return FinalizeRequest.buildFromEvent(
                    event as EboEvent<"RequestFinalized">,
                    this.registry,
                );

            default:
                throw new UnknownEvent(event.name);
        }
    }

    /**
     * Handle the last known event and triggers reactive interactions with smart contracts.
     *
     * A basic example would be reacting to a new request by proposing a response.
     *
     * @param event EBO event
     */
    private async onLastEvent(event: EboEvent<EboEventName>) {
        switch (event.name) {
            case "RequestCreated":
                await this.onRequestCreated(event as EboEvent<"RequestCreated">);

                break;

            case "ResponseProposed":
                await this.onResponseProposed(event as EboEvent<"ResponseProposed">);

                break;

            case "ResponseDisputed":
                await this.onResponseDisputed(event as EboEvent<"ResponseDisputed">);

                break;

            case "DisputeStatusChanged":
                await this.onDisputeStatusChanged(event as EboEvent<"DisputeStatusChanged">);

                break;

            case "DisputeEscalated":
                await this.onDisputeEscalated(event as EboEvent<"DisputeEscalated">);

                break;

            case "RequestFinalized":
                await this.onRequestFinalized(event as EboEvent<"RequestFinalized">);

                break;

            default:
                throw new UnknownEvent(event.name);
        }
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
        const proposalDeadline = request.decodedData.responseModuleData.deadline;
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

    /**
     * Try to settle all active disputes if settling is needed.
     *
     * @param blockNumber block number to check if the dispute is to be settled
     */
    private async settleDisputes(blockNumber: bigint): Promise<void> {
        const request = this.getActorRequest();
        const disputes: Dispute[] = this.getActiveDisputes();

        const settledDisputes = disputes.map(async (dispute) => {
            const responseId = dispute.prophetData.responseId;
            const response = this.registry.getResponse(responseId);

            if (!response) {
                this.logger.error(
                    `While trying to settle dispute ${dispute.id}, its response with ` +
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

        const { bondEscalationDeadline, tyingBuffer } = request.decodedData.disputeModuleData;
        const deadline = bondEscalationDeadline + tyingBuffer;

        return blockNumber > deadline;
    }

    /**
     * Try to settle a dispute. If the dispute should be escalated, it escalates it.
     *
     * @param request the dispute's request
     * @param response the dispute's response
     * @param dispute the dispute
     */
    private async settleDispute(
        request: Request,
        response: Response,
        dispute: Dispute,
    ): Promise<void> {
        try {
            this.logger.info(`Settling dispute ${dispute.id}...`);

            // OPTIMIZE: check for pledges to potentially save the ShouldBeEscalated error

            await this.protocolProvider.settleDispute(
                request.prophetData,
                response.prophetData,
                dispute.prophetData,
            );

            this.logger.info(`Dispute ${dispute.id} settled.`);
        } catch (err) {
            if (err instanceof ContractFunctionRevertedError) {
                const errorName = err.data?.errorName || err.name;
                this.logger.warn(`Call reverted for dispute ${dispute.id} due to: ${errorName}`);

                const customError = ErrorFactory.createError(errorName);
                customError.setContext({
                    request,
                    response,
                    dispute,
                    registry: this.registry,
                });

                customError.on("BondEscalationModule_ShouldBeEscalated", async () => {
                    try {
                        await this.protocolProvider.escalateDispute(
                            request.prophetData,
                            response.prophetData,
                            dispute.prophetData,
                        );
                        this.logger.info(`Dispute ${dispute.id} escalated.`);

                        await ErrorHandler.handle(customError, this.logger);
                    } catch (escalationError) {
                        this.logger.error(
                            `Failed to escalate dispute ${dispute.id}: ${escalationError}`,
                        );
                        throw escalationError;
                    }
                });
            } else {
                this.logger.error(`Failed to escalate dispute ${dispute.id}: ${err}`);
                throw err;
            }
        }
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
            response.createdAt + request.decodedData.disputeModuleData.disputeWindow;

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
     * At last, actors must be kept alive until their epoch concludes, to ensure no actor/request duplication.
     *
     * @param currentEpoch the epoch to check against actor termination
     * @param blockNumber block number to check entities at
     * @returns `true` if all entities are settled, otherwise `false`
     */
    public canBeTerminated(currentEpoch: Epoch["number"], blockNumber: bigint): boolean {
        const request = this.getActorRequest();
        const isPastEpoch = currentEpoch > request.epoch;
        const isRequestFinalized = request.status === "Finalized";
        const nonSettledProposals = this.activeProposals(blockNumber);

        return isPastEpoch && isRequestFinalized && nonSettledProposals.length === 0;
    }

    /**
     * Check for any active proposals at a specific block number.
     *
     * @param blockNumber block number to check proposals' status against
     * @returns an array of `Response` instances
     */
    private activeProposals(blockNumber: BlockNumber): Response[] {
        const responses = this.registry.getResponses();

        return responses.filter((response) => {
            if (this.isResponseAccepted(response, blockNumber)) return false;

            const dispute = this.registry.getResponseDispute(response);

            // Response has not been disputed but is not accepted yet, so it's active.
            if (!dispute) return true;

            // The rest of the status (ie "Escalated" | "Won" | "Lost" | "NoResolution")
            // cannot be changed by the EBO agent once they've been reached so they make
            // the proposal non-active.
            const activeStatus: DisputeStatus[] = ["None", "Active"];

            return activeStatus.includes(dispute.status);
        });
    }

    /**
     * Handle `RequestCreated` event.
     *
     * @param event `RequestCreated` event
     */
    private async onRequestCreated(event: EboEvent<"RequestCreated">): Promise<void> {
        const { chainId } = event.metadata;

        try {
            await this.proposeResponse(chainId);
        } catch (err) {
            if (err instanceof ContractFunctionRevertedError) {
                const request = this.getActorRequest();
                const customError = ErrorFactory.createError(err.name);

                customError.setContext({
                    request,
                    event,
                    registry: this.registry,
                });

                throw customError;
            } else {
                throw err;
            }
        }
    }

    /**
     * Check if the same proposal has already been made in the past.
     *
     * @param blockNumber proposed block number
     *
     * @returns true if there's a registry of a proposal with the same attributes, false otherwise
     */
    private alreadyProposed(blockNumber: bigint) {
        const request = this.getActorRequest();
        const responses = this.registry.getResponses();

        const newResponse = {
            prophetData: {
                requestId: request.id,
            },
            decodedData: {
                response: {
                    block: blockNumber,
                },
            },
        };

        for (const proposedResponse of responses) {
            const responseId = proposedResponse.id;

            if (this.equalResponses(newResponse, proposedResponse)) {
                this.logger.info(
                    `Block ${blockNumber} for epoch ${request.epoch} and chain ${request.chainId} already proposed on response ${responseId}. Skipping...`,
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
    private async buildResponseBody(chainId: Caip2ChainId): Promise<ResponseBody> {
        // FIXME(non-current epochs): adapt this code to fetch timestamps corresponding
        //  to the first block of any epoch, not just the current epoch
        const { startTimestamp: epochStartTimestamp } =
            await this.protocolProvider.getCurrentEpoch();

        const epochBlockNumber = await this.blockNumberService.getEpochBlockNumber(
            epochStartTimestamp,
            chainId,
        );

        return {
            block: epochBlockNumber,
        };
    }

    /**
     * Propose an actor request's response for a particular chain.
     *
     * @param chainId the CAIP-2 compliant chain ID
     */
    private async proposeResponse(chainId: Caip2ChainId): Promise<void> {
        const responseBody = await this.buildResponseBody(chainId);
        const request = this.getActorRequest();

        if (this.alreadyProposed(responseBody.block)) {
            throw new ResponseAlreadyProposed(request, responseBody);
        }

        const proposerAddress = this.protocolProvider.getAccountAddress();

        const response: Response["prophetData"] = {
            proposer: proposerAddress,
            requestId: request.id,
            response: ProtocolProvider.encodeResponse(responseBody),
        };

        try {
            await this.protocolProvider.proposeResponse(request.prophetData, response);
        } catch (err) {
            if (err instanceof ContractFunctionRevertedError) {
                const customError = ErrorFactory.createError(err.name);
                const context: ErrorContext = {
                    request,
                    registry: this.registry,
                };
                customError.setContext(context);

                await ErrorHandler.handle(customError, this.logger);

                this.logger.warn(
                    `Block ${responseBody.block} for epoch ${request.epoch} and ` +
                        `chain ${chainId} was not proposed. Skipping proposal...`,
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
    private async onResponseProposed(event: EboEvent<"ResponseProposed">): Promise<void> {
        const proposedResponse = this.registry.getResponse(event.metadata.responseId);

        const request = this.getActorRequest();

        if (!proposedResponse) {
            throw new ResponseNotFound(event.metadata.responseId);
        }

        const actorResponse = {
            prophetData: { requestId: request.id },
            decodedData: {
                response: await this.buildResponseBody(request.chainId),
            },
        };

        if (this.equalResponses(actorResponse, proposedResponse)) {
            this.logger.info(`Response ${event.metadata.responseId} was validated. Skipping...`);
            return;
        }

        const disputer = this.protocolProvider.getAccountAddress();
        const dispute: Dispute["prophetData"] = {
            disputer: disputer,
            proposer: proposedResponse.prophetData.proposer,
            responseId: Address.normalize(event.metadata.responseId) as ResponseId,
            requestId: request.id,
        };
        try {
            await this.protocolProvider.disputeResponse(
                request.prophetData,
                proposedResponse.prophetData,
                dispute,
            );
        } catch (err) {
            if (err instanceof ContractFunctionRevertedError) {
                const customError = ErrorFactory.createError(err.name);
                const response = this.registry.getResponse(event.metadata.responseId);

                customError.setContext({
                    request,
                    response,
                    event,
                    registry: this.registry,
                });

                throw customError;
            } else {
                throw err;
            }
        }
    }

    /**
     * Check for deep equality between two responses
     *
     * @param a {@link EqualResponseParameters} response a
     * @param b {@link EqualResponseParameters} response b
     *
     * @returns true if all attributes on `a` are equal to attributes on `b`, false otherwise
     */
    private equalResponses(a: EqualResponseParameters, b: EqualResponseParameters) {
        if (a.prophetData.requestId != b.prophetData.requestId) return false;
        if (a.decodedData.response.block != b.decodedData.response.block) return false;

        return true;
    }

    /**
     * Validate that the actor should handle the request by its ID.
     *
     * @param requestId request ID
     * @returns `true` if the actor is handling the request, `false` otherwise
     */
    private shouldHandleRequest(requestId: string) {
        return this.actorRequest.id.toLowerCase() === requestId.toLowerCase();
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
    private async onResponseDisputed(event: EboEvent<"ResponseDisputed">): Promise<void> {
        const dispute = this.registry.getDispute(event.metadata.disputeId);

        if (!dispute)
            throw new InvalidActorState(
                `Dispute ${event.metadata.disputeId} needs to be added to the internal registry.`,
            );

        const request = this.getActorRequest();
        const proposedResponse = this.registry.getResponse(event.metadata.responseId);

        if (!proposedResponse) throw new InvalidActorState();

        const isValidDispute = await this.isValidDispute(request, proposedResponse);

        if (isValidDispute) await this.pledgeFor(request, dispute);
        else await this.pledgeAgainst(request, dispute);
    }

    /**
     * Check if a dispute is valid, comparing the already submitted and disputed proposal with
     * the response this actor would propose.
     *
     * @param request the request of the proposed response
     * @param proposedResponse the already submitted response
     * @returns true if the hypothetical proposal is different that the submitted one, false otherwise
     */
    private async isValidDispute(request: Request, proposedResponse: Response) {
        const actorResponse = {
            prophetData: {
                requestId: request.id,
            },
            decodedData: {
                response: await this.buildResponseBody(request.chainId),
            },
        };

        const equalResponses = this.equalResponses(actorResponse, proposedResponse);

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
            this.logger.info(`Pledging for dispute ${dispute.id}`);

            await this.protocolProvider.pledgeForDispute(request.prophetData, dispute.prophetData);
        } catch (err) {
            if (err instanceof ContractFunctionRevertedError) {
                const errorName = err.data?.errorName || err.name;
                this.logger.warn(`Pledge for dispute ${dispute.id} reverted due to: ${errorName}`);

                const customError = ErrorFactory.createError(errorName);
                const context: ErrorContext = {
                    request,
                    dispute,
                    registry: this.registry,
                    terminateActor: () => {
                        throw customError;
                    },
                };
                customError.setContext(context);

                await ErrorHandler.handle(customError, this.logger);
            } else {
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
            this.logger.info(`Pledging against dispute ${dispute.id}`);

            await this.protocolProvider.pledgeAgainstDispute(
                request.prophetData,
                dispute.prophetData,
            );
        } catch (err) {
            if (err instanceof ContractFunctionRevertedError) {
                const errorName = err.data?.errorName || err.name;
                this.logger.warn(
                    `Pledge against dispute ${dispute.id} reverted due to: ${errorName}`,
                );

                const customError = ErrorFactory.createError(errorName);
                const context: ErrorContext = {
                    request,
                    dispute,
                    registry: this.registry,
                    terminateActor: () => {
                        throw customError;
                    },
                };
                customError.setContext(context);

                await ErrorHandler.handle(customError, this.logger);
            } else {
                throw err;
            }
        }
    }

    /**
     * Handle the `DisputeStatusChanged` event.
     *
     * @param event `DisputeStatusChanged` event
     */
    private async onDisputeStatusChanged(event: EboEvent<"DisputeStatusChanged">): Promise<void> {
        const request = this.getActorRequest();
        const disputeId = event.metadata.disputeId;
        const disputeStatus = event.metadata.status;

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
            case "Escalated": // Case handled by DisputeEscalated
                break;

            case "NoResolution":
                await this.onDisputeWithNoResolution(disputeId, request);

                break;

            default:
                throw new InvalidDisputeStatus(disputeId, disputeStatus);
        }
    }

    private async onDisputeEscalated(event: EboEvent<"DisputeEscalated">) {
        const request = this.getActorRequest();

        // TODO: notify

        this.logger.info(
            `Dispute ${event.metadata.disputeId} for request ${request.id} has been escalated.`,
        );
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
    private async onRequestFinalized(_event: EboEvent<"RequestFinalized">): Promise<void> {
        const request = this.getActorRequest();

        this.logger.info(`Request ${request.id} has been finalized.`);
    }
}
