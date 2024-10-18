export class UnknownDisputeStatus extends Error {
    constructor(status: number) {
        super(`Unknown dispute status ${status}`);
        this.name = "UnknownDisputeStatus";
    }
}
