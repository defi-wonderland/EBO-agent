import { ResponseBody } from "../types/prophet.js";

export class ResponseAlreadyProposed extends Error {
    constructor(response: ResponseBody) {
        super(
            `Block ${response.block} was already proposed for epoch ${response.epoch} on chain ${response.chainId}`,
        );

        this.name = "ResponseAlreadyProposed";
    }
}
