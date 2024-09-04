export class InvalidActorState extends Error {
    constructor(message?: string) {
        // TODO: we'll want to dump the Actor state into stderr at this point
        super(
            `The actor is in an invalid state. ${message ? `Reason: ${message}` : "Unknown reason."}`,
        );

        this.name = "InvalidActorState";
    }
}
