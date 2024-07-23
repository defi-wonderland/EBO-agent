export class UnsupportedBlockNumber extends Error {
    constructor(timestamp: bigint) {
        super(`Block with null block number at ${timestamp}`);

        this.name = "UnsupportedBlockNumber";
    }
}
