export class InvalidDisputeStatus extends Error {
    constructor(disputeId: string, status: string) {
        super(`Invalid status ${status} for dispute ${disputeId}`);

        this.name = "InvalidDisputeStatus";
    }
}
