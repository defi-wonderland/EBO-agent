import { Block } from "viem";

export class LastBlockEpoch extends Error {
    constructor(block: Block) {
        super(
            `Cannot specify the start of the epoch with the last block only (number: ${block.number}), wait for it to be finalized.`,
        );

        this.name = "LastBlockEpoch";
    }
}
