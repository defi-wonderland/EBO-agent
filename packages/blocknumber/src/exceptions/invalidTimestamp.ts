export class InvalidTimestamp extends Error {
    constructor(timestamp: number | bigint) {
        super(`Timestamp ${timestamp} is prior the timestamp of the first block.`);

        this.name = "InvalidTimestamp";
    }
}
