import { Request, ResponseBody } from "../types/prophet.js";

export class ResponseAlreadyProposed extends Error {
    constructor(request: Request, response: ResponseBody) {
        const { epoch, chainId } = request.decodedData.requestModuleData;

        super(
            `Block ${response.block} was already proposed for epoch ${epoch} on chain ${chainId}`,
        );

        this.name = "ResponseAlreadyProposed";
    }
}
