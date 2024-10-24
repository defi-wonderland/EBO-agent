import { CustomContractError } from "../exceptions/index.js";
import { isDispute } from "../guards.js";
import { ErrorContext, ErrorHandlingStrategy, ErrorName } from "../types/index.js";

const errorStrategiesEntries: [ErrorName, ErrorHandlingStrategy][] = [
    [
        "ValidatorLib_InvalidResponseBody",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "BondEscalationAccounting_InsufficientFunds",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: false,
        },
    ],
    [
        "BondEscalationAccounting_AlreadySettled",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "BondEscalationModule_InvalidDispute",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: true,
            customAction: async (context: ErrorContext) => {
                if (isDispute(context.dispute)) {
                    context.registry.removeDispute(context.dispute.id);
                }
            },
        },
    ],
    [
        "AccountingExtension_InsufficientFunds",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: false,
        },
    ],
    [
        "Oracle_InvalidDisputeId",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: true,
            customAction: async (context: ErrorContext) => {
                if (isDispute(context.dispute)) {
                    context.registry.removeDispute(context.dispute.id);
                }
            },
        },
    ],
    [
        "Oracle_InvalidDispute",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: true,
            customAction: async (context: ErrorContext) => {
                if (isDispute(context.dispute)) {
                    context.registry.removeDispute(context.dispute.id);
                }
            },
        },
    ],
    [
        "Oracle_InvalidDisputeBody",
        {
            shouldNotify: true,
            shouldTerminate: true,
            shouldReenqueue: false,
        },
    ],
    [
        "Oracle_AlreadyFinalized",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "EBORequestModule_InvalidRequester",
        {
            shouldNotify: true,
            shouldTerminate: true,
            shouldReenqueue: false,
        },
    ],
    [
        "EBORequestModule_ChainNotAdded",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: false,
        },
    ],
    [
        "EBORequestCreator_InvalidEpoch",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "Oracle_InvalidRequestBody",
        {
            shouldNotify: true,
            shouldTerminate: true,
            shouldReenqueue: false,
        },
    ],
    [
        "EBORequestCreator_RequestAlreadyCreated",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "Oracle_InvalidRequest",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: false,
        },
    ],
    [
        "Oracle_InvalidResponseBody",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "AccountingExtension_NotAllowed",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: false,
        },
    ],
    [
        "BondedResponseModule_AlreadyResponded",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "BondedResponseModule_TooLateToPropose",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "Oracle_CannotEscalate",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "Validator_InvalidDispute",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: true,
            customAction: async (context: ErrorContext) => {
                if (isDispute(context.dispute)) {
                    context.registry.removeDispute(context.dispute.id);
                }
            },
        },
    ],
    [
        "ValidatorLib_InvalidDisputeBody",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: true,
            customAction: async (context: ErrorContext) => {
                if (isDispute(context.dispute)) {
                    context.registry.removeDispute(context.dispute.id);
                }
            },
        },
    ],
    [
        "EBOFinalityModule_InvalidRequester",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: false,
        },
    ],
    [
        "Oracle_InvalidFinalizedResponse",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "Oracle_InvalidResponse",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: true,
            customAction: async (context: ErrorContext) => {
                if (context.response) {
                    context.registry.removeResponse(context.response.id);
                }
            },
        },
    ],
    [
        "Oracle_FinalizableResponseExists",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "ArbitratorModule_InvalidArbitrator",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: true,
            customAction: async (context: ErrorContext) => {
                if (isDispute(context.dispute)) {
                    context.registry.removeDispute(context.dispute.id);
                }
            },
        },
    ],
    [
        "AccountingExtension_UnauthorizedModule",
        {
            shouldNotify: true,
            shouldTerminate: true,
            shouldReenqueue: false,
        },
    ],
    [
        "BondEscalationModule_NotEscalatable",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "BondEscalationModule_BondEscalationNotOver",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "BondEscalationModule_BondEscalationOver",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: false,
        },
    ],
    [
        "BondEscalationModule_DisputeWindowOver",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: false,
        },
    ],
    [
        "Oracle_ResponseAlreadyDisputed",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "BondEscalationModule_CannotBreakTieDuringTyingBuffer",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "BondEscalationModule_CanOnlySurpassByOnePledge",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "BondEscalationModule_MaxNumberOfEscalationsReached",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "Oracle_NotDisputeOrResolutionModule",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: false,
        },
    ],
    [
        "BondEscalationModule_ShouldBeEscalated",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldReenqueue: false,
            // Custom action to escalate dispute is implemented in eboActor.ts
        },
    ],
    [
        "BondEscalationModule_BondEscalationCantBeSettled",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
    [
        "BondEscalationModule_BondEscalationNotOver",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldReenqueue: true,
        },
    ],
];

const errorStrategies = new Map<ErrorName, ErrorHandlingStrategy>(errorStrategiesEntries);

export class ErrorFactory {
    public static createError(errorName: ErrorName | string): CustomContractError {
        if (!errorStrategies.has(errorName as ErrorName)) {
            return new CustomContractError("UnknownError", {
                shouldNotify: true,
                shouldTerminate: false,
                shouldReenqueue: true,
            });
        }
        const strategy = errorStrategies.get(errorName as ErrorName)!;

        return new CustomContractError(errorName as ErrorName, strategy);
    }
}
