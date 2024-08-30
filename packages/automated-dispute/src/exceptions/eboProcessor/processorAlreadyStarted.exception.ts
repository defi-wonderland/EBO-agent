export class ProcessorAlreadyStarted extends Error {
    constructor() {
        super(`Processor was already started.`);

        this.name = "ProcessorAlreadyStarted";
    }
}
