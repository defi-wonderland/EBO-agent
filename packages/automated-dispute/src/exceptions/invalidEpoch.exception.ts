export class EBORequestCreator_InvalidEpoch extends Error {
    constructor() {
        super("Invalid epoch");
        this.name = "EBORequestCreator_InvalidEpoch";
    }
}
