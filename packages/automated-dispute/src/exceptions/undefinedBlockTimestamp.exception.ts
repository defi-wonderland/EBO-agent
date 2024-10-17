export class UndefinedBlockTimestamp extends Error {
    constructor() {
        super(`Undefined block timestamp`);
        this.name = "UndefinedBlockTimestamp";
    }
}
