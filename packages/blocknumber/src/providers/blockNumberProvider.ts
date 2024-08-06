export interface BlockNumberProvider {
    /**
     * Get the block number corresponding to the beginning of the epoch.
     *
     * The input timestamp falls between the timestamps of the found block and
     * the immediately following block.
     *
     * @param timestamp UTC timestamp in ms since UNIX epoch
     *
     * @returns the corresponding block number of a chain at a specific timestamp
     */
    getEpochBlockNumber(timestamp: bigint): Promise<bigint>;
}
