export class InvalidBlockRangeError extends Error {
    constructor(fromBlock: bigint, toBlock: bigint) {
        super(
            `Invalid block range: fromBlock (${fromBlock}) must be less than or equal to toBlock (${toBlock})`,
        );
        this.name = "InvalidBlockRangeError";
    }
}
