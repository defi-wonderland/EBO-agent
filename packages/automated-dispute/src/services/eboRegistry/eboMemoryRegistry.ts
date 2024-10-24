import { DisputeNotFound, RequestNotFound } from "../../exceptions/index.js";
import { EboRegistry } from "../../interfaces/index.js";
import {
    Dispute,
    DisputeStatus,
    Request,
    RequestId,
    RequestStatus,
    Response,
} from "../../types/index.js";

export class EboMemoryRegistry implements EboRegistry {
    constructor(
        private requests: Map<RequestId, Request> = new Map(),
        private responses: Map<string, Response> = new Map(),
        private responsesDisputes: Map<string, string> = new Map(),
        private disputes: Map<string, Dispute> = new Map(),
    ) {}

    /** @inheritdoc */
    public addRequest(request: Request) {
        this.requests.set(request.id, request);
    }

    /** @inheritdoc */
    public getRequest(requestId: RequestId) {
        return this.requests.get(requestId);
    }

    public updateRequestStatus(requestId: RequestId, status: RequestStatus): void {
        const request = this.getRequest(requestId);

        if (request === undefined) throw new RequestNotFound(requestId);

        this.requests.set(requestId, {
            ...request,
            status: status,
        });
    }

    /** @inheritdoc */
    public removeRequest(requestId: RequestId): boolean {
        return this.requests.delete(requestId);
    }

    /** @inheritdoc */
    public addResponse(response: Response): void {
        this.responses.set(response.id, response);
    }

    /** @inheritdoc */
    public getResponses() {
        return [...this.responses.values()];
    }

    /** @inheritdoc */
    public getResponse(responseId: string): Response | undefined {
        return this.responses.get(responseId);
    }

    /** @inheritdoc */
    removeResponse(responseId: string): boolean {
        return this.responses.delete(responseId);
    }

    /** @inheritdoc */
    public addDispute(dispute: Dispute): void {
        this.disputes.set(dispute.id, dispute);
        this.responsesDisputes.set(dispute.prophetData.responseId, dispute.id);
    }

    /** @inheritdoc */
    public getDisputes(): Dispute[] {
        return [...this.disputes.values()];
    }

    /** @inheritdoc */
    public getDispute(disputeId: string): Dispute | undefined {
        return this.disputes.get(disputeId);
    }

    /** @inheritdoc */
    public getResponseDispute(response: Response): Dispute | undefined {
        const disputeId = this.responsesDisputes.get(response.id);

        if (!disputeId) return undefined;

        return this.getDispute(disputeId);
    }

    /** @inheritdoc */
    public updateDisputeStatus(disputeId: string, status: DisputeStatus): void {
        const dispute = this.getDispute(disputeId);

        if (dispute === undefined) throw new DisputeNotFound(disputeId);

        this.disputes.set(disputeId, {
            ...dispute,
            status: status,
        });
    }

    /** @inheritdoc */
    removeDispute(disputeId: string): boolean {
        // FIXME: remove also all records in responseDispute (probably adding a reverse map,
        //  as response<>dispute is a 1 to 1 relationship would be a nice approach)
        return this.disputes.delete(disputeId);
    }
}
