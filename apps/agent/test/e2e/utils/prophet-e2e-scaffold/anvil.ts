import { createServer } from "prool";
import { anvil } from "prool/instances";

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
