export class Oracle_InvalidRequestBody extends Error {
    constructor() {
        super("Invalid request body");
        this.name = "Oracle_InvalidRequestBody";
    }
}
