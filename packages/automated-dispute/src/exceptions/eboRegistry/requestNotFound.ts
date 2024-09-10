export class RequestNotFound extends Error {
    constructor(requestId: string) {
        super(`Request ${requestId} was not found.`);

        this.name = "RequestNotFound";
    }
}
