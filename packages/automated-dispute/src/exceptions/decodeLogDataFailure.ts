export class DecodeLogDataFailure extends Error {
    constructor(err: unknown) {
        super(`Error decoding log data: ${err}`);

        this.name = "DecodeLogDataFailure";
    }
}
