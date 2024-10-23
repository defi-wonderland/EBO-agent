import { approveModules } from "./utilities/approveAccountingModules.js";

(async () => {
    try {
        await approveModules();
    } catch (error) {
        console.error("An unexpected error occurred:", error);
        process.exit(1);
    }
})();
