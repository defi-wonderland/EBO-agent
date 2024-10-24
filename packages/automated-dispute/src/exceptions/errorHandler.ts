import { ILogger } from "@ebo-agent/shared";

import { CustomContractError } from "../exceptions/index.js";
import { NotificationService } from "../interfaces/index.js";

export class ErrorHandler {
    private notificationService: NotificationService;
    private logger: ILogger;

    constructor(notificationService: NotificationService, logger: ILogger) {
        this.notificationService = notificationService;
        this.logger = logger;
    }

    public async handle(error: CustomContractError): Promise<void> {
        const strategy = error.strategy;
        const context = error.getContext();

        this.logger.error(`Error occurred: ${error.message}`);

        try {
            await error.executeCustomAction();
        } catch (actionError) {
            this.logger.error(`Error executing custom action: ${actionError}`);
        } finally {
            if (strategy.shouldNotify) {
                await this.notificationService.notifyError(error, context);
            }

            if (strategy.shouldReenqueue && context.reenqueueEvent) {
                context.reenqueueEvent();
            }

            if (strategy.shouldTerminate && context.terminateActor) {
                context.terminateActor();
            } else {
                this.logger.warn(`Event handling caused an error`);
            }
        }
    }
}
