import { createServer } from "prool";
import { anvil } from "prool/instances";
import {
    Account,
    Chain,
    Client,
    PublicActions,
    TestActions,
    TestRpcSchema,
    Transport,
    WalletActions,
} from "viem";

export type AnvilClient<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends Account | undefined = Account | undefined,
> = Client<
    transport,
    chain,
    account,
    TestRpcSchema<"anvil">,
    PublicActions<transport, chain, account> & WalletActions<chain, account> & TestActions
>;

export async function createAnvilServer(
    host: string,
    port: number,
    anvilConfig: Parameters<typeof anvil>[0],
) {
    const anvilServer = createServer({
        instance: anvil(anvilConfig),
        host: host,
        port: port,
        limit: 1,
    });

    await anvilServer.start();

    console.log("Server is up");

    return anvilServer;
}
