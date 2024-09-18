import { CustomContractError } from "../exceptions/index.js";
import { EventReactError } from "../types/index.js";

export class ErrorHandler {
    public static async handle(error: CustomContractError, context: any): Promise<void> {
        const strategy = error.strategy;

        console.error(`Error occurred: ${error.message}`);

        if (strategy.shouldNotify) {
            await this.notifyError(error, context);
        }

        await error.executeCustomAction();

        if ((strategy as EventReactError).shouldReenqueue) {
            if (context.reenqueueEvent) {
                context.reenqueueEvent();
            }
        }

        if (strategy.shouldTerminate) {
            if (context.terminateActor) {
                context.terminateActor();
            }
        }

        if (strategy.shouldConsume) {
            if (context.consumeEvent) {
                context.consumeEvent();
            }
        }
    }

    private static async notifyError(error: CustomContractError, context: any): Promise<void> {
        // TODO: notification logic
        console.log(error, context);
    }
}
