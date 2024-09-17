import { CustomContractError } from "../exceptions/index.js";
import { ErrorHandlingStrategy, ErrorScenario } from "../types/index.js";

const errorStrategies: Map<string, ErrorHandlingStrategy> = new Map([
    //TODO: add all error strategies
    [
        "EBORequestCreator_InvalidEpoch",
        {
            scenario: ErrorScenario.Unrecoverable,
            shouldNotify: true,
            shouldTerminate: true,
            shouldConsume: false,
        },
    ],
]);

export class ErrorFactory {
    public static createError(errorName: string): CustomContractError {
        const strategy = errorStrategies.get(errorName);

        if (!strategy) {
            return new CustomContractError(errorName, {
                scenario: ErrorScenario.Unrecoverable,
                shouldNotify: true,
                shouldTerminate: true,
                shouldConsume: true,
            });
        }

        return new CustomContractError(errorName, strategy);
    }
}
