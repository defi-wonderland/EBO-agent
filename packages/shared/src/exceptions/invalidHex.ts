export class InvalidHex extends Error {
    constructor(str: string) {
        super(`Invalid address: ${str}`);
    }
}
