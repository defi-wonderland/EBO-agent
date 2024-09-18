import { CustomContractError } from "../exceptions/index.js";
import { ErrorHandlingStrategy } from "../types/index.js";

const errorStrategiesEntries: [string, ErrorHandlingStrategy][] = [
    [
        "ValidatorLib_InvalidResponseBody",
        {
            shouldNotify: true,
            shouldTerminate: true,
            shouldConsume: false,
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
