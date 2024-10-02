import { ErrorContext, ErrorHandlingStrategy, ErrorName } from "../types/index.js";

export class CustomContractError extends Error {
    public override name: ErrorName;
    public strategy: ErrorHandlingStrategy;
    private context!: ErrorContext;
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
