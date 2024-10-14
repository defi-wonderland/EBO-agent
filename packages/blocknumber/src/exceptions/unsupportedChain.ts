import { Caip2ChainId } from "@ebo-agent/shared";
import { Hex } from "viem";

export class UnsupportedChain extends Error {
    constructor(chainId: Caip2ChainId | Hex) {
        super(`Chain ${chainId} is not supported.`);

        this.name = "UnsupportedChain";
    }
}
