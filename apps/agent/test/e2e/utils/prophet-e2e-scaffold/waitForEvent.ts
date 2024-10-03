import { AbiEvent, Chain, GetLogsParameters, HttpTransport, Log, PublicClient } from "viem";

interface WaitForEventInput<abi extends AbiEvent, chain extends Chain> {
    client: PublicClient<HttpTransport, chain>;
    filter: GetLogsParameters<abi, never, true>;
    matcher: (log: Log<bigint, number, boolean, abi, true>) => boolean;
    pollingInterval: number;
    blockTimeout: bigint;
}

export async function waitForEvent<abi extends AbiEvent, chain extends Chain>(
    input: WaitForEventInput<abi, chain>,
) {
    const { client, filter, matcher, pollingInterval, blockTimeout } = input;

    let currentBlock: bigint;

    do {
        currentBlock = (await client.getBlock({ blockTag: "latest" })).number;

        const logs = await client.getLogs(filter);

        if (logs.some(matcher as any)) return true;

        await new Promise((r) => setTimeout(r, pollingInterval));
    } while (currentBlock < blockTimeout);

    return false;
}
