import { DisputeNotFound } from "./exceptions/eboRegistry/disputeNotFound.js";
import { EboRegistry } from "./interfaces/eboRegistry.js";
import { Dispute, DisputeStatus, Request, Response } from "./types/prophet.js";

export class EboMemoryRegistry implements EboRegistry {
    constructor(
        private requests: Map<string, Request> = new Map(),
        private responses: Map<string, Response> = new Map(),
        private responsesDisputes: Map<string, string> = new Map(),
        private disputes: Map<string, Dispute> = new Map(),
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
    public addResponse(responseId: string, response: Response): void {
        this.responses.set(responseId, response);
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
    public addDispute(disputeId: string, dispute: Dispute): void {
        this.disputes.set(disputeId, dispute);
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
}
