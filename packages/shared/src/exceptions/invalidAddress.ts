export class InvalidAddress extends Error {
    constructor(str: string) {
        super(`Invalid address: ${str}`);
    }
}
