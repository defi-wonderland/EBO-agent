export class TransactionExecutionError extends Error {
    constructor(message = "Transaction failed") {
        super(message);
        this.name = "TransactionExecutionError";
    }
}
