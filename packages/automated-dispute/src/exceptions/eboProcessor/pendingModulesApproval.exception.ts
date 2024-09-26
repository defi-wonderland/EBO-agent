import { AccountingModules } from "../../types/index.js";

export class PendingModulesApproval extends Error {
    constructor(
        public readonly approvedModules: Partial<AccountingModules>,
        public readonly pendingModules: Partial<AccountingModules>,
    ) {
        const approvedModulesStr = Object.entries(approvedModules)
            .map(([key, value]) => `(${key}: ${value})`)
            .join(", ");

        const pendingModulesStr = Object.entries(pendingModules)
            .map(([key, value]) => `(${key}: ${value})`)
            .join(", ");

        super(
            `Modules approved: ${approvedModulesStr}\n` +
                `Modules pending approval: ${pendingModulesStr}`,
        );
    }
}
