export class UndefinedBlockNumber extends Error {
    constructor(isoTimestamp: string) {
        super(`Undefined block number at ${isoTimestamp}.`);

        this.name = "UndefinedBlockNumber";
    }
}
