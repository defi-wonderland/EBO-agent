export class EBORequestModule_InvalidRequester extends Error {
    constructor() {
        super("Invalid requester");
        this.name = "EBORequestModule_InvalidRequester";
    }
}
