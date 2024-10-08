import { isNativeError } from "util/types";
import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Caip2ChainId } from "@ebo-agent/blocknumber/src/index.js";
import { Address, EBO_SUPPORTED_CHAIN_IDS, ILogger } from "@ebo-agent/shared";

import { PendingModulesApproval, ProcessorAlreadyStarted } from "../exceptions/index.js";
import { isRequestCreatedEvent } from "../guards.js";
import { ProtocolProvider } from "../providers/protocolProvider.js";
import {
    alreadyDeletedActorWarning,
    droppingUnhandledEventsWarning,
    pendingApprovedModulesError,
} from "../templates/index.js";
import {
    AccountingModules,
    ActorRequest,
    EboEvent,
    EboEventName,
    Epoch,
    RequestId,
} from "../types/index.js";
import { EboActorsManager } from "./eboActorsManager.js";

const DEFAULT_MS_BETWEEN_CHECKS = 10 * 60 * 1000; // 10 minutes

type EboEventStream = EboEvent<EboEventName>[];

export class EboProcessor {
    private eventsInterval?: NodeJS.Timeout;
    private lastCheckedBlock?: bigint;

    constructor(
        private readonly accountingModules: AccountingModules,
        private readonly protocolProvider: ProtocolProvider,
        private readonly blockNumberService: BlockNumberService,
        private readonly actorsManager: EboActorsManager,
        private readonly logger: ILogger,
    ) {}

    /**
     * Start syncing blocks and events
     *
     * @param msBetweenChecks milliseconds between each sync
     */
    public async start(msBetweenChecks: number = DEFAULT_MS_BETWEEN_CHECKS) {
        if (this.eventsInterval) throw new ProcessorAlreadyStarted();

        await this.checkAllModulesApproved();

        await this.sync(); // Bootstrapping

        this.eventsInterval = setInterval(async () => {
            try {
                await this.sync();
            } catch (err) {
                this.logger.error(`Unhandled error during the event loop: ${err}`);

                clearInterval(this.eventsInterval);

                throw err;
            }
        }, msBetweenChecks);
    }

    /**
     * Check if all the modules have been granted approval within the accounting module.
     *
     * @throws {PendingModulesApproval} when there is at least one module pending approval
     */
    private async checkAllModulesApproved() {
        const approvedModules: Address[] =
            await this.protocolProvider.getAccountingApprovedModules();

        const summary: Record<"approved" | "notApproved", Partial<AccountingModules>> = {
            approved: {},
            notApproved: {},
        };

        for (const [moduleName, moduleAddress] of Object.entries(this.accountingModules)) {
            const isApproved = approvedModules.includes(moduleAddress);
            const key = isApproved ? "approved" : "notApproved";

            summary[key][moduleName as keyof AccountingModules] = moduleAddress;
        }

        if (Object.keys(summary.notApproved).length > 0) {
            const accountingModuleAddress = this.protocolProvider.getAccountingModuleAddress();

            this.logger.error(
                pendingApprovedModulesError(
                    accountingModuleAddress,
                    summary["approved"],
                    summary["notApproved"],
                ),
            );

            throw new PendingModulesApproval(summary["approved"], summary["notApproved"]);
        }
    }

    /** Sync new blocks and their events with their corresponding actors. */
    private async sync() {
        try {
            const currentEpoch = await this.getCurrentEpoch();

            if (!this.lastCheckedBlock) {
                this.lastCheckedBlock = currentEpoch.firstBlockNumber;
            }

            const lastBlock = await this.getLastFinalizedBlock();
            const events = await this.getEvents(this.lastCheckedBlock, lastBlock);

            const eventsByRequestId = this.groupEventsByRequest(events);
            const synchableRequests = this.calculateSynchableRequests([
                ...eventsByRequestId.keys(),
            ]);

            this.logger.info(
                `Reading events for the following requests:\n${synchableRequests.join(", ")}`,
            );

            const synchedRequests = [...synchableRequests].map(async (requestId: RequestId) => {
                try {
                    const events = eventsByRequestId.get(requestId) ?? [];

                    await this.syncRequest(requestId, events, currentEpoch.number, lastBlock);
                } catch (err) {
                    this.onActorError(requestId, err as Error);
                }
            });

            await Promise.all(synchedRequests);

            this.logger.info(`Consumed events up to block ${lastBlock}.`);

            this.createMissingRequests(currentEpoch.number);

            this.lastCheckedBlock = lastBlock;
        } catch (err) {
            if (isNativeError(err)) {
                this.logger.error(`Sync failed: ` + `${err.message}\n\n` + `${err.stack}`);
            } else {
                this.logger.error(`Sync failed: ${err}`);
            }

            // TODO: notify
        }
    }

    /**
     * Fetches the current epoch for the protocol chain.
     *
     * @returns the current epoch properties of the protocol chain.
     */
    private async getCurrentEpoch(): Promise<Epoch> {
        this.logger.info("Fetching current epoch...");

        const currentEpoch = await this.protocolProvider.getCurrentEpoch();

        this.logger.info(`Current epoch fetched.`);

        return currentEpoch;
    }

    /**
     * Fetches the last finalized block on the protocol chain.
     *
     * @returns the last finalized block
     */
    private async getLastFinalizedBlock(): Promise<bigint> {
        this.logger.info("Fetching last finalized block...");

        const lastBlock = await this.protocolProvider.getLastFinalizedBlock();

        this.logger.info(`Last finalized block ${lastBlock} fetched.`);

        return lastBlock;
    }

    /**
     * Fetches the events to process during the sync.
     *
     * @param fromBlock block number lower bound for event search
     * @param toBlock block number upper bound for event search
     * @returns an array of events
     */
    private async getEvents(fromBlock: bigint, toBlock: bigint): Promise<EboEvent<EboEventName>[]> {
        this.logger.info(`Fetching events between blocks ${fromBlock} and ${toBlock}...`);

        const events = await this.protocolProvider.getEvents(fromBlock, toBlock);

        this.logger.info(`${events.length} events fetched.`);

        return events;
    }

    /**
     * Group events by its normalized request ID.
     * .
     *
     * @param events a raw stream of events for, potentially, several requests
     * @returns a map with normalized request ID as a key and an array of the request's events as value.
     */
    private groupEventsByRequest(events: EboEventStream) {
        const groupedEvents = new Map<RequestId, EboEventStream>();

        for (const event of events) {
            const requestId = Address.normalize(event.requestId) as RequestId;
            const requestEvents = groupedEvents.get(requestId) || [];

            groupedEvents.set(requestId, [...requestEvents, event]);
        }

        return groupedEvents;
    }

    /**
     * Calculate the request IDs that should be considered for sync by merging the
     * request IDs read from events and the request IDs already being handled by an actor.
     *
     * @param eventsRequestIds request IDs observed in an events batch
     * @returns request IDS to sync
     */
    private calculateSynchableRequests(eventsRequestIds: RequestId[]): RequestId[] {
        const actorsRequestIds = this.actorsManager.getRequestIds();
        const uniqueRequestIds = new Set([...eventsRequestIds, ...actorsRequestIds]);

        return [...uniqueRequestIds].map((requestId) => Address.normalize(requestId) as RequestId);
    }

    /**
     * Sync the actor with new events and update the state based on the last block.
     *
     * @param requestId the ID of the `Request`
     * @param events a stream of consumed events
     * @param currentEpoch the current epoch based on the last block
     * @param lastBlock the last block checked
     */
    private async syncRequest(
        requestId: RequestId,
        events: EboEventStream,
        currentEpoch: Epoch["number"],
        lastBlock: bigint,
    ) {
        const firstEvent = events[0];
        const actor = this.getOrCreateActor(requestId, firstEvent);

        if (!actor) {
            this.logger.warn(droppingUnhandledEventsWarning(requestId));

            return;
        }

        events.forEach((event) => actor.enqueue(event));

        await actor.processEvents();
        await actor.onLastBlockUpdated(lastBlock);

        if (actor.canBeTerminated(currentEpoch, lastBlock)) {
            this.terminateActor(requestId);
        }
    }

    /**
     * Get the actor handling a specific request. If there's no actor created yet, it's created.
     *
     * @param requestId the ID of the request the returned actor is handling
     * @param firstEvent an event to create an actor if it does not exist
     * @returns the actor handling the specified request
     */
    private getOrCreateActor(requestId: RequestId, firstEvent?: EboEvent<EboEventName>) {
        const actor = this.actorsManager.getActor(requestId);

        if (actor) return actor;

        if (firstEvent && isRequestCreatedEvent(firstEvent)) {
            const chainId = firstEvent.metadata.chainId;

            if (this.isChainSupported(chainId)) {
                this.logger.info(`Creating a new EboActor to handle request ${requestId}...`);

                return this.createNewActor(firstEvent);
            } else {
                this.logger.warn(`Chain ${chainId} not supported by the agent. Skipping...`);

                // TODO: notify

                return null;
            }
        } else {
            return null;
        }
    }

    /**
     * Returns true if the CAIP2 compliant chain ID is supported by the EBO agent.
     *
     * @param chainId CAIP2 chain ID
     * @returns true if the chain is supported, otherwise false
     */
    private isChainSupported(chainId: Caip2ChainId): boolean {
        return EBO_SUPPORTED_CHAIN_IDS.includes(chainId);
    }

    /**
     * Create a new actor based on the data provided by a `RequestCreated` event.
     *
     * @param event a `RequestCreated` event
     * @returns a new `EboActor` instance, `null` if the actor was not created
     */
    private createNewActor(event: EboEvent<"RequestCreated">) {
        const actorRequest: ActorRequest = {
            id: Address.normalize(event.requestId) as RequestId,
            epoch: event.metadata.epoch,
            chainId: event.metadata.chainId,
        };

        const actor = this.actorsManager.createActor(
            actorRequest,
            this.protocolProvider,
            this.blockNumberService,
            this.logger,
        );

        return actor;
    }

    private onActorError(requestId: RequestId, error: Error) {
        this.logger.error(
            `Critical error. Actor event handling request ${requestId} ` +
                `threw a non-recoverable error: ${error.message}\n\n` +
                `The request ${requestId} will stop being tracked by the system.`,
        );

        // TODO: notify

        this.terminateActor(requestId);
    }

    /**
     * Creates missing requests for the specified epoch, based on the
     * available chains and the currently being handled requests.
     *
     * @param epoch the epoch number
     */
    private async createMissingRequests(epoch: Epoch["number"]): Promise<void> {
        try {
            const handledEpochChains = this.actorsManager
                .getActorsRequests()
                .reduce((actorRequestMap, actorRequest: ActorRequest) => {
                    const epochRequests = actorRequestMap.get(actorRequest.epoch) ?? new Set();

                    epochRequests.add(actorRequest.chainId);

                    return actorRequestMap.set(actorRequest.epoch, epochRequests);
                }, new Map<Epoch["number"], Set<Caip2ChainId>>());

            this.logger.info("Fetching available chains...");

            const availableChains: Caip2ChainId[] =
                await this.protocolProvider.getAvailableChains();

            this.logger.info("Available chains fetched.");

            const unhandledEpochChain = availableChains.filter((chain) => {
                const epochRequests = handledEpochChains.get(epoch);
                const isHandled = epochRequests && epochRequests.has(chain);

                return !isHandled;
            });

            this.logger.info("Creating missing requests...");

            const epochChainRequests = unhandledEpochChain.map(async (chain) => {
                try {
                    this.logger.info(`Creating request for chain ${chain} and epoch ${epoch}...`);

                    await this.protocolProvider.createRequest(epoch, chain);

                    this.logger.info(`Request created for chain ${chain} and epoch ${epoch}`);
                } catch (err) {
                    // Request creation must be notified but it's not critical, as it will be
                    // retried during next sync.

                    // TODO: warn when getting a EBORequestCreator_RequestAlreadyCreated
                    // TODO: notify under any other error

                    this.logger.error(
                        `Could not create a request for epoch ${epoch} and chain ${chain}.`,
                    );
                }
            });

            await Promise.all(epochChainRequests);

            this.logger.info("Missing requests created.");
        } catch (err) {
            // TODO: notify

            this.logger.error(
                `Requests creation missing: ${isNativeError(err) ? err.message : err}`,
            );
        }
    }

    /**
     * Removes the actor from tracking the request.
     *
     * @param requestId the ID of the request the actor is handling
     */
    private terminateActor(requestId: RequestId) {
        this.logger.info(`Terminating actor handling request ${requestId}...`);

        const deletedActor = this.actorsManager.deleteActor(requestId);

        if (deletedActor) {
            this.logger.info(`Actor handling request ${requestId} was terminated.`);
        } else {
            this.logger.warn(alreadyDeletedActorWarning(requestId));

            // TODO: notify
        }
    }

    private async notifyError(_error: Error) {
        // TODO
    }
}
