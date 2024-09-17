import { ErrorHandlingStrategy } from "../types/index.js";

export class CustomContractError extends Error {
    public override name: string;
    public strategy: ErrorHandlingStrategy;
    private context: any = {};
    private customActions: Map<string, (context: any) => Promise<void> | void> = new Map();

    constructor(name: string, strategy: ErrorHandlingStrategy) {
        super(`Contract reverted: ${name}`);
        this.name = name;
        this.strategy = strategy;
    }

    public setContext(context: any): this {
        this.context = context;
        return this;
    }

    public on(errorName: string, action: (context: any) => Promise<void> | void): this {
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
