import { EboRegistry } from "./interfaces/eboRegistry.js";
import { Dispute, Request, Response } from "./types/prophet.js";

export class EboMemoryRegistry implements EboRegistry {
    private requests: Map<string, Request>;
    private responses: Map<string, Response>;
    private dispute: Map<string, Dispute>;

    constructor() {
        this.requests = new Map();
        this.responses = new Map();
        this.dispute = new Map();
    }

    public addRequest(requestId: string, request: Request) {
        this.requests.set(requestId, request);
    }

    public getResponses() {
        return this.responses;
    }
}
