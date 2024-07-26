import { Caip2ChainId } from "../types.js";

export class UnsupportedChain extends Error {
    constructor(chainId: Caip2ChainId) {
        super(`Chain ${chainId} is not supported.`);

        this.name = "UnsupportedChain";
    }
}
