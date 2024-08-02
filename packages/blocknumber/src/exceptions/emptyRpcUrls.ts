export class EmptyRpcUrls extends Error {
    constructor() {
        super(`At least one chain with its RPC endpoint must be defined.`);

        this.name = "EmptyRpcUrls";
    }
}
