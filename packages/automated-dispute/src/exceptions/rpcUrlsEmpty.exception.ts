export class RpcUrlsEmptyException extends Error {
    constructor() {
        super("The rpcUrls array cannot be empty.");
        this.name = "RpcUrlsEmptyException";
    }
}
