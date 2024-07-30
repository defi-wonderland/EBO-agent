export class RpcUrlsEmpty extends Error {
    constructor() {
        super("The rpcUrls array cannot be empty.");
        this.name = "RpcUrlsEmpty";
    }
}
