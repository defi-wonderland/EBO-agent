export class UnknownEvent extends Error {
    constructor(eventName: string) {
        super(`Unknown event: ${eventName}`);
    }
}
