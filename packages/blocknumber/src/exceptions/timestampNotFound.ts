export class TimestampNotFound extends Error {
    constructor(timestamp: number | bigint) {
        super(`No block was processed during ${timestamp}.`);

        this.name = "TimestampNotFound";
    }
}
