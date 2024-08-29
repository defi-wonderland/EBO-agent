import { BlockNumberService } from "@ebo-agent/blocknumber";
import { Address, ILogger } from "@ebo-agent/shared";

import { EboActorsManager } from "../eboActorsManager.js";
import { ProcessorAlreadyStarted } from "../exceptions/index.js";
import { ProtocolProvider } from "../protocolProvider.js";
import { alreadyDeletedActorWarning, droppingUnhandledEventsWarning } from "../templates/index.js";
import { EboEvent, EboEventName } from "../types/events.js";
import { RequestId } from "../types/prophet.js";

const DEFAULT_MS_BETWEEN_CHECKS = 10 * 60 * 1000; // 10 minutes

type EboEventStream = EboEvent<EboEventName>[];

export class EboProcessor {
    private eventsInterval?: NodeJS.Timeout;
    private lastCheckedBlock?: bigint;

    constructor(
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

    /** Sync new blocks and their events with their corresponding actors. */
    private async sync() {
        // TODO: detect new epoch by comparing subgraph's data with EpochManager's current epoch
        //  and trigger a request creation if there's no actor handling an <epoch, chain> request.
        //  This process should somehow check if there's already a request created for the epoch
        //  and chain that has no agent assigned and create it if that's the case.

        if (!this.lastCheckedBlock) {
            this.lastCheckedBlock = await this.getEpochStartBlock();
        }

        const lastBlock = await this.protocolProvider.getLastFinalizedBlock();
        const events = await this.protocolProvider.getEvents(this.lastCheckedBlock, lastBlock);
        const eventsByRequestId = this.groupEventsByRequest(events);

        const synchableRequests = this.calculateSynchableRequests([...eventsByRequestId.keys()]);
        const synchedRequests = [...synchableRequests].map(async (requestId: RequestId) => {
            try {
                const events = eventsByRequestId.get(requestId) ?? [];

                await this.syncRequest(requestId, events, lastBlock);
            } catch (err) {
                this.onActorError(requestId, err as Error);
            }
        });

        await Promise.all(synchedRequests);

        this.lastCheckedBlock = lastBlock;
    }

    /**
     * Fetches the first block of the current epoch.
     *
     * @returns the first block of the current epoch
     */
    private async getEpochStartBlock() {
        const { currentEpochBlockNumber } = await this.protocolProvider.getCurrentEpoch();

        return currentEpochBlockNumber;
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
            const requestId = Address.normalize(event.requestId);
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
    private calculateSynchableRequests(eventsRequestIds: RequestId[]) {
        const actorsRequestIds = this.actorsManager.getRequestIds();
        const uniqueRequestIds = new Set([...eventsRequestIds, ...actorsRequestIds]);

        return [...uniqueRequestIds].map((requestId) => Address.normalize(requestId));
    }

    /**
     * Sync the actor with new events and update the state based on the last block.
     *
     * @param requestId the ID of the `Request`
     * @param events a stream of consumed events
     * @param lastBlock the last block checked
     */
    private async syncRequest(requestId: RequestId, events: EboEventStream, lastBlock: bigint) {
        const firstEvent = events[0];
        const actor = this.getOrCreateActor(requestId, firstEvent);

        if (!actor) {
            this.logger.warn(droppingUnhandledEventsWarning(requestId));

            return;
        }

        events.forEach((event) => actor.enqueue(event));

        await actor.processEvents();
        await actor.onLastBlockUpdated(lastBlock);

        if (actor.canBeTerminated()) {
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

        if (firstEvent && firstEvent.name === "RequestCreated") {
            this.logger.info(`Creating a new EboActor to handle request ${requestId}...`);

            return this.createNewActor(firstEvent as EboEvent<"RequestCreated">);
        } else {
            return null;
        }
    }

    /**
     * Create a new actor based on the data provided by a `RequestCreated` event.
     *
     * @param event a `RequestCreated` event
     * @returns a new `EboActor` instance, `null` if the actor was not created
     */
    private createNewActor(event: EboEvent<"RequestCreated">) {
        const actorRequest = {
            id: Address.normalize(event.requestId),
            epoch: event.metadata.epoch,
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
