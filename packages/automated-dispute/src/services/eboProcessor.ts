import { BlockNumberService } from "@ebo-agent/blocknumber";
import { ILogger } from "@ebo-agent/shared";

import { EboActor } from "../eboActor.js";
import { EboActorsManager } from "../eboActorsManager.js";
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
        //  and trigger a request creation.

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
                // FIXME: to avoid one request bringing down the whole agent if an error is thrown,
                //  the failing request's actor (if any) will be silently removed.
                //
                // On the enhancements phase, the processor will try to recover that particular actor,
                // if possible, by recreating the actor again and trying to handle all request events.
                this.logger.error(`Handling events for ${requestId} caused an error: ${err}`);

                // TODO: notify

                this.actorsManager.deleteActor(requestId);
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
     * Group events by its request ID.
     * .
     *
     * @param events a raw stream of events for, potentially, several requests
     * @returns a map with request ID as a key and an array of the request's events as value.
     */
    private groupEventsByRequest(events: EboEventStream) {
        const groupedEvents = new Map<RequestId, EboEventStream>();

        for (const event of events) {
            const requestEvents = groupedEvents.get(event.requestId) || [];

            groupedEvents.set(event.requestId, [...requestEvents, event]);
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
        const actorsRequestIds = this.actorsManager.getEntries().map((entry) => entry[0]);
        const uniqueRequestIds = new Set([...eventsRequestIds, ...actorsRequestIds]);

        return [...uniqueRequestIds];
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
        const actor = await this.getOrCreateActor(requestId, firstEvent);

        if (!actor) {
            this.logger.warn(droppingUnhandledEventsWarning(requestId));

            return;
        }

        const sortedEvents = events.sort(this.compareByBlockAndLogIndex);

        sortedEvents.forEach((event, idx) => {
            // NOTE: forEach preserves events' order, DO NOT use a for loop
            actor.updateState(event);

            const isLastEvent = idx === events.length - 1;
            if (isLastEvent) actor.onNewEvent(event);
        });

        actor.onLastBlockUpdated(lastBlock);

        if (actor.canBeTerminated()) {
            this.terminateActor(requestId);
        }
    }

    /**
     * Compare function to sort events chronologically in ascending order by block number
     * and log index.
     *
     * @param e1 EBO event
     * @param e2 EBO event
     * @returns 1 if `e2` is older than `e1`, -1 if `e1` is older than `e2`, 0 otherwise
     */
    private compareByBlockAndLogIndex(e1: EboEvent<EboEventName>, e2: EboEvent<EboEventName>) {
        if (e1.blockNumber > e2.blockNumber) return 1;
        if (e1.blockNumber < e2.blockNumber) return -1;

        return e1.logIndex - e2.logIndex;
    }

    /**
     * Get the actor handling a specific request. If there's no actor created yet, it's created.
     *
     * @param requestId the ID of the request the returned actor is handling
     * @param firstEvent an event to create an actor if it does not exist
     * @returns the actor handling the specified request
     */
    private async getOrCreateActor(requestId: RequestId, firstEvent?: EboEvent<EboEventName>) {
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
     * @returns a new `EboActor` instance
     */
    private async createNewActor(event: EboEvent<"RequestCreated">) {
        // FIXME: this is one of the places where we should change
        //  the processor's behavior if we want to support non-current epochs
        const { currentEpochTimestamp } = await this.protocolProvider.getCurrentEpoch();

        const actorRequest = {
            id: event.requestId,
            epoch: event.metadata.epoch,
            epochTimestamp: currentEpochTimestamp,
        };

        const actor = this.actorsManager.createActor(
            actorRequest,
            this.protocolProvider,
            this.blockNumberService,
            this.logger,
        );

        return actor;
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

    private async onActorError(_actor: EboActor, _error: Error) {
        // TODO
    }

    private async notifyError(_error: Error) {
        // TODO
    }
}
