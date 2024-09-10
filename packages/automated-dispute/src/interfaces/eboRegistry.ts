import {
    Dispute,
    DisputeStatus,
    Request,
    RequestId,
    RequestStatus,
    Response,
} from "../types/index.js";

/** Registry that stores Prophet entities (ie. requests, responses and disputes) */
export interface EboRegistry {
    /**
     * Add a `Request` by ID.
     *
     * @param request the `Request`
     */
    addRequest(request: Request): void;

    /**
     * Get a `Request` by ID.
     *
     * @param requestId request ID
     * @returns the request if already added into registry, `undefined` otherwise
     */
    getRequest(requestId: RequestId): Request | undefined;

    /**
     * Update the request status based on its ID.
     *
     * @param requestId the ID of the `Request`
     * @param status the `Request` status
     */
    updateRequestStatus(requestId: string, status: RequestStatus): void;

    /**
     * Remove a `Request` by its ID.
     *
     * @param requestId request ID
     * @returns `true` if the request in the registry existed and has been removed, or `false` if the request does not exist
     */
    removeRequest(requestId: string): boolean;

    /**
     * Add a `Response` by ID.
     *
     * @param response the `Response`
     */
    addResponse(response: Response): void;

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
     * Remove a `Response` by its ID.
     *
     * @param responseId response ID
     * @returns `true` if the response in the registry existed and has been removed, or `false` if the response does not exist
     */
    removeResponse(responseId: string): boolean;

    /**
     * Add a dispute by ID.
     *
     * @param dispute the `Dispute`
     */
    addDispute(dispute: Dispute): void;

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

    /**
     * Remove a `Dispute` by its ID.
     *
     * @param disputeId dispute ID
     * @returns `true` if the dispute in the registry existed and has been removed, or `false` if the dispute does not exist
     */
    removeDispute(disputeId: string): boolean;
}
