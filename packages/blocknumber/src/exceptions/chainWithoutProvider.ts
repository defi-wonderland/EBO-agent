import { Caip2ChainId } from "@ebo-agent/shared";

export class ChainWithoutProvider extends Error {
    constructor(chainId: Caip2ChainId) {
        super(`Chain ${chainId} has no provider defined.`);

        this.name = "ChainWithoutProvider";
    }
}
