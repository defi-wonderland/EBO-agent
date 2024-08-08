import { EboRegistry } from "./interfaces/eboRegistry.js";
import { Dispute, Request, Response } from "./types/prophet.js";

export class EboMemoryRegistry implements EboRegistry {
    constructor(
        private requests: Map<string, Request> = new Map(),
        private responses: Map<string, Response> = new Map(),
        private dispute: Map<string, Dispute> = new Map(),
    ) {}

    /** @inheritdoc */
    public addRequest(requestId: string, request: Request) {
        this.requests.set(requestId, request);
    }

    /** @inheritdoc */
    public getRequest(requestId: string) {
        return this.requests.get(requestId);
    }

    /** @inheritdoc */
    public getResponses() {
        return this.responses;
    }
}
