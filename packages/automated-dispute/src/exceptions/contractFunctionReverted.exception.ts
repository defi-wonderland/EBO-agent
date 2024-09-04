export class ContractFunctionReverted extends Error {
    constructor() {
        super(`Contract function reverted`);

        this.name = "ContractFunctionReverted";
    }
}
