import { ILogger } from "@ebo-agent/shared";

import { CustomContractError } from "../exceptions/index.js";
import { ErrorContext } from "../types/index.js";

export class ErrorHandler {
    public static async handle(error: CustomContractError, logger: ILogger): Promise<void> {
        const strategy = error.strategy;
        const context = error.getContext();

        logger.error(`Error occurred: ${error.message}`);

        try {
            await error.executeCustomAction();
        } catch (actionError) {
            logger.error(`Error executing custom action: ${actionError}`);
        } finally {
            if (strategy.shouldNotify) {
                await this.notifyError(error, context);
            }

            if (strategy.shouldReenqueue && context.reenqueueEvent) {
                context.reenqueueEvent();
            }

            if (strategy.shouldTerminate && context.terminateActor) {
                context.terminateActor();
            }
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
