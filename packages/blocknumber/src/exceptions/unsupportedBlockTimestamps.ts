export class UnsupportedBlockTimestamps extends Error {
    constructor(timestamp: number | bigint) {
        super(`Found multiple blocks at ${timestamp}.`);

        this.name = "UnsupportedBlockTimestamps";
    }
}
