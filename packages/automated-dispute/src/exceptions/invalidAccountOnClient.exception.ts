export class InvalidAccountOnClient extends Error {
    constructor(message?: string) {
        super(
            `The account on the client is invalid. ${message ? `Reason: ${message}` : "Unknown reason."}`,
        );

        this.name = "InvalidAccountOnClient";
    }
}
