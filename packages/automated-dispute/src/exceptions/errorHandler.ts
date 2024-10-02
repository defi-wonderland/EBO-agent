import { CustomContractError } from "../exceptions/index.js";
import { ErrorContext, EventReactError } from "../types/index.js";

export class ErrorHandler {
    public static async handle(error: CustomContractError, context: ErrorContext): Promise<void> {
        const strategy = error.strategy;

        console.error(`Error occurred: ${error.message}`);

        error.setContext(context);

        if (strategy.shouldNotify) {
            await this.notifyError(error, context);
        }

        await error.executeCustomAction();

        if ((strategy as EventReactError).shouldReenqueue && context.reenqueueEvent) {
            context.reenqueueEvent();
        }

        if (strategy.shouldTerminate && context.terminateActor) {
            context.terminateActor();
        }

        if (strategy.shouldReenqueue && context.reenqueueEvent) {
            context.reenqueueEvent();
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
