export class EBORequestCreator_ChainNotAdded extends Error {
    constructor() {
        super("Chain not added");
        this.name = "EBORequestCreator_ChainNotAdded";
    }
}
