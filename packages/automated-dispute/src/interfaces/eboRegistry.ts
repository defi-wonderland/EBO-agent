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
     * @returns responses array
     */
    getResponses(): Response[];

    /**
     * Return the dispute of a response
     *
     * @returns a dispute if the response has been disputed, `undefined` otherwise
     */
    getResponseDispute(response: Response): Dispute | undefined;

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

    /**
     * Get all disputes
     *
     * @returns an array of `Dispute` instances
     */
    getDisputes(): Dispute[];

    /**
     * Get a `Dispute` by ID.
     *
     * @param disputeId dispute ID
     * @returns the `Dispute` if already added into registry, `undefined` otherwise
     */
    getDispute(disputeId: string): Dispute | undefined;

    /**
     * Update the dispute status based on its ID.
     *
     * @param disputeId the ID of the `Dispute`
     * @param status the `Dispute`
     */
    updateDisputeStatus(disputeId: string, status: DisputeStatus): void;
}
