export class ResponseNotFound extends Error {
    constructor(responseId: string) {
        super(`Response ${responseId} was not found.`);

        this.name = "ResponseNotFound";
    }
}
