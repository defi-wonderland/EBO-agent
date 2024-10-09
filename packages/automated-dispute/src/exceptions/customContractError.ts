import {
    EboEvent,
    EboEventName,
    ErrorContext,
    ErrorHandlingStrategy,
    ErrorName,
} from "../types/index.js";

export class CustomContractError extends Error {
    public override name: ErrorName;
    public strategy: ErrorHandlingStrategy;
    public context!: ErrorContext;
    private customActions: Map<ErrorName, (context: ErrorContext) => Promise<void> | void> =
        new Map();

    constructor(name: ErrorName, strategy: ErrorHandlingStrategy) {
        super(`Contract reverted: ${name}`);
        this.name = name;
        this.strategy = strategy;
    }

    public setContext(context: ErrorContext): this {
        this.context = context;
        return this;
    }

    public getContext(): ErrorContext {
        return this.context;
    }

    /**
     * Sets the context specific to processEvents.
     * This method replaces addContext for processEvents-related context updates.
     *
     * @param event The event being processed.
     * @param reenqueueEvent Callback to reenqueue the event.
     * @param terminateActor Callback to terminate the actor.
     * @returns The error instance.
     */
    public setProcessEventsContext(
        event: EboEvent<EboEventName>,
        reenqueueEvent: () => void,
        terminateActor: () => void,
    ): this {
        this.context = {
            ...this.context,
            event,
            reenqueueEvent,
            terminateActor,
        };
        return this;
    }

    public on(errorName: string, action: (context: ErrorContext) => Promise<void> | void): this {
        if (this.name === errorName) {
            this.customActions.set(errorName, action);
        }
        return this;
    }

    public async executeCustomAction(): Promise<void> {
        const action = this.customActions.get(this.name) || this.strategy.customAction;
        if (action) {
            await action(this.context);
        }
    }
}
