import { CustomContractError } from "../exceptions/index.js";
import { ErrorContext } from "../types/index.js";

export class ErrorHandler {
    public static async handle(error: CustomContractError): Promise<void> {
        const strategy = error.strategy;
        const context = error.getContext();

        console.error(`Error occurred: ${error.message}`);

        if (strategy.shouldNotify) {
            await this.notifyError(error, context);
        }

        try {
            await error.executeCustomAction();
        } catch (actionError) {
            console.error(`Error executing custom action: ${actionError}`);
            // Continue without rethrowing
        }

        if (strategy.shouldReenqueue && context.reenqueueEvent) {
            context.reenqueueEvent();
        }

        if (strategy.shouldTerminate && context.terminateActor) {
            context.terminateActor();
        }
    }

    private static async notifyError(
        error: CustomContractError,
        context: ErrorContext,
    ): Promise<void> {
        // TODO: notification logic
        console.log(error, context);
    }
}
