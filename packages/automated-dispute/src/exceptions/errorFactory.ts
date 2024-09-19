import { CustomContractError } from "../exceptions/index.js";
import { ErrorHandlingStrategy } from "../types/index.js";

const errorStrategiesEntries: [string, ErrorHandlingStrategy][] = [
    [
        "ValidatorLib_InvalidResponseBody",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "BondEscalationAccounting_InsufficientFunds",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: false,
        },
    ],
    [
        "BondEscalationAccounting_AlreadySettled",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "BondEscalationModule_InvalidDispute",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: true,
            customAction: async (context) => {
                context.registry.removeDispute(context.dispute.id);
            },
        },
    ],
    [
        "AccountingExtension_InsufficientFunds",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: false,
        },
    ],
    [
        "Oracle_InvalidDisputeId",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: true,
            customAction: async (context) => {
                context.registry.removeDispute(context.dispute.id);
            },
        },
    ],
    [
        "Oracle_InvalidDispute",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: true,
            customAction: async (context) => {
                context.registry.removeDispute(context.dispute.id);
            },
        },
    ],
    [
        "Oracle_InvalidDisputeBody",
        {
            shouldNotify: true,
            shouldTerminate: true,
            shouldConsume: false,
        },
    ],
    [
        "Oracle_AlreadyFinalized",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "EBORequestModule_InvalidRequester",
        {
            shouldNotify: true,
            shouldTerminate: true,
            shouldConsume: false,
        },
    ],
    [
        "EBORequestModule_ChainNotAdded",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: false,
        },
    ],
    [
        "EBORequestCreator_InvalidEpoch",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "Oracle_InvalidRequestBody",
        {
            shouldNotify: true,
            shouldTerminate: true,
            shouldConsume: false,
        },
    ],
    [
        "EBORequestCreator_RequestAlreadyCreated",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "Oracle_InvalidRequest",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: false,
        },
    ],
    [
        "Oracle_InvalidResponseBody",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "AccountingExtension_NotAllowed",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: false,
        },
    ],
    [
        "BondedResponseModule_AlreadyResponded",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "BondedResponseModule_TooLateToPropose",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "Oracle_CannotEscalate",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "Validator_InvalidDispute",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: true,
            customAction: async (context) => {
                context.registry.removeDispute(context.dispute.id);
            },
        },
    ],
    [
        "ValidatorLib_InvalidDisputeBody",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: true,
            customAction: async (context) => {
                context.registry.removeDispute(context.dispute.id);
            },
        },
    ],
    [
        "EBOFinalityModule_InvalidRequester",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: false,
        },
    ],
    [
        "Oracle_InvalidFinalizedResponse",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "Oracle_InvalidResponse",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: true,
            customAction: async (context) => {
                context.registry.removeResponse(context.response.id);
            },
        },
    ],
    [
        "Oracle_FinalizableResponseExists",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "ArbitratorModule_InvalidArbitrator",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: true,
            customAction: async (context) => {
                context.registry.removeDispute(context.dispute.id);
            },
        },
    ],
    [
        "AccountingExtension_UnauthorizedModule",
        {
            shouldNotify: true,
            shouldTerminate: true,
            shouldConsume: false,
        },
    ],
    [
        "BondEscalationModule_NotEscalatable",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "BondEscalationModule_BondEscalationNotOver",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "BondEscalationModule_BondEscalationOver",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "BondEscalationModule_DisputeWindowOver",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "Oracle_ResponseAlreadyDisputed",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "BondEscalationModule_CannotBreakTieDuringTyingBuffer",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "BondEscalationModule_CanOnlySurpassByOnePledge",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "BondEscalationModule_MaxNumberOfEscalationsReached",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "Oracle_NotDisputeOrResolutionModule",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: false,
        },
    ],
    [
        "BondEscalationModule_ShouldBeEscalated",
        {
            shouldNotify: true,
            shouldTerminate: false,
            shouldConsume: false,
            // Custom action to escalate dispute is implemented in eboActor.ts
        },
    ],
    [
        "BondEscalationModule_BondEscalationCantBeSettled",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
    [
        "BondEscalationModule_BondEscalationNotOver",
        {
            shouldNotify: false,
            shouldTerminate: false,
            shouldConsume: true,
        },
    ],
];

const errorStrategies = new Map<string, ErrorHandlingStrategy>(errorStrategiesEntries);

export class ErrorFactory {
    public static createError(errorName: string): CustomContractError {
        const strategy = errorStrategies.get(errorName);

        if (!strategy) {
            return new CustomContractError(errorName, {
                shouldNotify: true,
                shouldTerminate: false,
                shouldConsume: true,
            });
        }

        return new CustomContractError(errorName, strategy);
    }
}
