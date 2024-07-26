import { Caip2ChainId } from "../types.js";

export class ChainWithoutProvider extends Error {
    constructor(chainId: Caip2ChainId) {
        super(`Chain ${chainId} has no provider defined.`);

        this.name = "ChainWithoutProvider";
    }
}
