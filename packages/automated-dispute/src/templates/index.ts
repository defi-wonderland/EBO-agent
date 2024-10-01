import { Address } from "viem";

import { AccountingModules, RequestId } from "../types/prophet.js";

export const alreadyDeletedActorWarning = (requestId: RequestId) => `
Actor handling request ${requestId} was already deleted.

It is strongly suggested to check request status on-chain to be sure its responses and disputes have been correctly settled.,
`;

export const droppingUnhandledEventsWarning = (requestId: RequestId) => `
Dropping events for request ${requestId} because no actor is handling it and the first event the agent read is not a \`RequestCreated\` event.

The request likely started before the current epoch's first block, which will not be handled by the agent.
`;

export const pendingApprovedModulesError = (
    horizonAddress: Address,
    approvedModules: Partial<AccountingModules>,
    notApprovedModules: Partial<AccountingModules>,
) => {
    const approvedModulesList = Object.entries(approvedModules).map(
        ([key, value]) => `* ${key} at ${value}\n`,
    );
    const notApprovedModulesList = Object.entries(notApprovedModules).map(
        ([key, value]) => `* ${key} at ${value}\n`,
    );

    return `
The EBO agent cannot proceed until certain actions are resolved by the operator.

The following modules already have approvals from HorizonAccountingExtension at ${horizonAddress}:
${approvedModulesList}

The following modules need approval from HorizonAccountingExtension at ${horizonAddress}:
${notApprovedModulesList}

To grant the necessary approvals, please run the script located at:

apps/scripts/approveAccountingModules.ts

Once approvals are completed, restart the EBO agent to continue.
`;
};
