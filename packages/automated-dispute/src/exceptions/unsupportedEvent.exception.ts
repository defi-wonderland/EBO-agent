export class UnsupportedEvent extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnsupportedEvent";
    }
}
