import { EboEvent, EboEventName } from "../../types/index.js";

export class PastEventEnqueueError extends Error {
    constructor(lastEvent: EboEvent<EboEventName>, enqueuedEvent: EboEvent<EboEventName>) {
        super(
            `Cannot enqueue event ${enqueuedEvent.name} at block ${enqueuedEvent.blockNumber} ` +
                `as it's older than the last processed event ${lastEvent.name} at block ${lastEvent.blockNumber}.`,
        );
    }
}
