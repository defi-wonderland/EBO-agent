export class RequestMismatch extends Error {
    constructor(requestId: string, eventRequestId: string) {
        super(`Actor handling request ${requestId} received a request ${eventRequestId} event.`);
        this.name = "RequestMismatch";
    }
}
