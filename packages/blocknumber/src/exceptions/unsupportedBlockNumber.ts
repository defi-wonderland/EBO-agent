import { UnixTimestamp } from "@ebo-agent/shared";

export class UnsupportedBlockNumber extends Error {
    constructor(timestamp: UnixTimestamp) {
        super(`Block with null block number at ${timestamp}`);

        this.name = "UnsupportedBlockNumber";
    }
}
