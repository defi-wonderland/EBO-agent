import { Request, ResponseBody } from "../types/prophet.js";

export class ResponseAlreadyProposed extends Error {
    constructor(request: Request, response: ResponseBody) {
        super(
            `Block ${response.block} was already proposed for epoch ${request.epoch} on chain ${request.chainId}`,
        );

        this.name = "ResponseAlreadyProposed";
    }
}
