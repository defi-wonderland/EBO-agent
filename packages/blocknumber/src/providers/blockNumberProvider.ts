export interface BlockNumberProvider {
    /**
     * Get the epoch block number on a chain at a specific timestamp.
     *
     * @param timestamp UTC timestamp in ms since UNIX epoch
     * @param url url of the chain data provider
     *
     * @returns the corresponding block number of a chain at a specific timestamp
     */
    getEpochBlockNumber(timestamp: number, searchParams: unknown): Promise<bigint>;
}
