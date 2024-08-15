export class DisputeNotFound extends Error {
    constructor(disputeId: string) {
        super(`Dispute ${disputeId} was not found.`);

        this.name = "DisputeNotFound";
    }
}
