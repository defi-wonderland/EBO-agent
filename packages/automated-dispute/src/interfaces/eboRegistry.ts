import { Dispute, DisputeStatus, Request, Response } from "../types/prophet.js";

/** Registry that stores Prophet entities (ie. requests, responses and disputes) */
export interface EboRegistry {
    /**
     * Add a `Request` by ID.
     *
     * @param requestId the ID of the `Request` to use as index
     * @param request the `Request`
     */
    addRequest(requestId: string, request: Request): void;

    /**
     * Get a `Request` by ID.
     *
     * @param requestId request ID
     * @returns the request if already added into registry, `undefined` otherwise
     */
    getRequest(requestId: string): Request | undefined;

    /**
     * Add a `Response` by ID.
     *
     * @param responseId the ID of the `Response` to use as index
     * @param response the `Response`
     */
    addResponse(responseId: string, response: Response): void;

    /**
     * Return all responses
     *
     * @returns responses map
     */
    getResponses(): Map<string, Response>;

    /**
     * Get a `Response` by ID.
     *
     * @param responseId response ID
     * @returns the `Response` if already added into registry, `undefined` otherwise
     */
    getResponse(responseId: string): Response | undefined;

    /**
     * Add a dispute by ID.
     *
     * @param disputeId the ID of the `Dispute` to use as index
     * @param dispute the `Dispute`
     */
    addDispute(disputeId: string, dispute: Dispute): void;
}
