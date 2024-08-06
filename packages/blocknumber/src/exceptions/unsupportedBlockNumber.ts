import { Timestamp } from "@ebo-agent/shared";

export class UnsupportedBlockNumber extends Error {
    constructor(timestamp: Timestamp) {
        super(`Block with null block number at ${timestamp}`);

        this.name = "UnsupportedBlockNumber";
    }
}
