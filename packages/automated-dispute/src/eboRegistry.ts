import { Dispute, Request, Response } from "./types/prophet.js";

export class EboRegistry {
    private requests: Map<string, Request>;
    private responses: Map<string, Response>;
    private dispute: Map<string, Dispute>;

    constructor() {
        this.requests = new Map();
        this.responses = new Map();
        this.dispute = new Map();
    }

    /**
     * Add a `Request` by ID.
     *
     * @param requestId the ID of the `Request`
     * @param request the `Request`
     */
    public addRequest(requestId: string, request: Request) {
        this.requests.set(requestId, request);
    }
}
