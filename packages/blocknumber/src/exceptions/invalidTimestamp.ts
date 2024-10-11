import { UnixTimestamp } from "@ebo-agent/shared";

export class InvalidTimestamp extends Error {
    constructor(timestamp: number | UnixTimestamp) {
        super(`Timestamp ${timestamp} is prior the timestamp of the first block.`);

        this.name = "InvalidTimestamp";
    }
}
