import { AbiEvent, GetLogsParameters, Log, MaybeAbiEventName } from "viem";

import { AnvilClient } from "./anvil.js";

interface WaitForEventInput<abi extends AbiEvent, client extends AnvilClient> {
    /** Client to use for event polling */
    client: client;
    /** Event filtering */
    filter: GetLogsParameters<abi, [abi], true>;
    /** Matcher to apply to filtered events */
    matcher?: (
        log: Log<bigint, number, false, abi, true, [abi], MaybeAbiEventName<abi>>,
    ) => boolean;

    /** Event polling interval in milliseconds */
    pollingIntervalMs: number;
    /** Block number to time out after the polled chain has reached the specified block */
    blockTimeout: bigint;
}

/**
 * Wait for an event that meets `matcher` condition, up to `blockTimeout`.
 *
 * @param input {@link WaitForEventInput}
 * @returns true if an event that matches `matcher` has been polled. false if `blockTimeout` is reached by the polled chain.
 */
export async function waitForEvent<abi extends AbiEvent, client extends AnvilClient>(
    input: WaitForEventInput<abi, client>,
) {
    const { client, filter, matcher, pollingIntervalMs: pollingInterval, blockTimeout } = input;

    let currentBlock: bigint;

    do {
        currentBlock = (await client.getBlock({ blockTag: "latest" })).number;

        const logs = await client.getLogs<abi, [abi], true>(filter);
        const matchingLogs = matcher ? logs.filter(matcher) : logs;

        if (matchingLogs && matchingLogs.length > 0) return matchingLogs[0];

        await new Promise((r) => setTimeout(r, pollingInterval));
    } while (currentBlock < blockTimeout);

    throw new Error(`Event ${filter.event?.name} not found.`);
}
