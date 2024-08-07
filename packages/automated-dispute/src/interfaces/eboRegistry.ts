import { Request, Response } from "../types/prophet.js";

export interface EboRegistry {
    /**
     * Add a `Request` by ID.
     *
     * @param requestId the ID of the `Request`
     * @param request the `Request`
     */
    addRequest(requestId: string, request: Request): void;

    /**
     * Return all responses
     *
     * @returns responses map
     */
    getResponses(): Map<string, Response>;
}
