export class InvalidActorState extends Error {
    constructor() {
        // TODO: we'll want to dump the Actor state into stderr at this point
        super("The actor is in an invalid state.");

        this.name = "InvalidActorState";
    }
}
