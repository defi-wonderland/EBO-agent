import { ILogger } from "@ebo-agent/shared";

import { CustomContractError } from "../exceptions/index.js";
import { NotificationService } from "../services/index.js";

export class ErrorHandler {
    private notificationService: NotificationService;

    constructor(notificationService: NotificationService) {
        this.notificationService = notificationService;
    }

    public async handle(error: CustomContractError, logger: ILogger): Promise<void> {
        const strategy = error.strategy;
        const context = error.getContext();

        logger.error(`Error occurred: ${error.message}`);

        try {
            await error.executeCustomAction();
        } catch (actionError) {
            logger.error(`Error executing custom action: ${actionError}`);
        } finally {
            if (strategy.shouldNotify) {
                await this.notificationService.notifyError(error, context);
            }

            if (strategy.shouldReenqueue && context.reenqueueEvent) {
                context.reenqueueEvent();
            }

            if (strategy.shouldTerminate && context.terminateActor) {
                context.terminateActor();
            }
        }
    }
}
