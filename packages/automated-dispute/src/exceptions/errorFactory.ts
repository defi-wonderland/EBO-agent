import { CustomContractError } from "../exceptions/index.js";
import { ErrorHandlingStrategy } from "../types/index.js";

const errorStrategies: Map<string, ErrorHandlingStrategy> = new Map([
    //TODO: add all error strategies
    [
        "EBORequestCreator_InvalidEpoch",
        {
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
                shouldNotify: true,
                shouldTerminate: false,
                shouldConsume: true,
            });
        }

        return new CustomContractError(errorName, strategy);
    }
}
