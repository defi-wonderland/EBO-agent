export class InvalidBlockHashError extends Error {
    constructor() {
        super("The event blockHash is null or invalid.");
        this.name = "InvalidBlockHashError";
    }
}
