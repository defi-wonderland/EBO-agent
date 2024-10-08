export class UnknownCustomError extends Error {
    constructor(errorName?: string) {
        super(`Unknown custom error: ${errorName}`);
        this.name = "UnknownCustomError";
    }
}
