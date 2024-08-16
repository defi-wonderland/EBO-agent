export class RequestAlreadyHandled extends Error {
    constructor(requestId: string) {
        super(`Request ${requestId} is already being handled by another actor.`);

        this.name = "RequestAlreadyHandled";
    }
}
