import { Timestamp } from "@ebo-agent/shared";

/**
 * Type representing an epoch's data.
 *
 * @property {bigint} epoch - epoch number
 * @property {bigint} epochFirstBlockNumber - number of the first block of the epoch
 * @property {Timestamp} epochStartTimestamp - timestamp of the first block of the epoch
 */
export type Epoch = {
    number: bigint;
    firstBlockNumber: bigint;
    startTimestamp: Timestamp;
};
