export enum ErrorScenario {
    Skippable = "Skippable",
    Retryable = "Retryable",
    Unrecoverable = "Unrecoverable",
}

export type BaseErrorStrategy = {
    scenario: ErrorScenario;
    shouldNotify: boolean;
    shouldTerminate: boolean;
    shouldConsume: boolean;
    customAction?: (context: any) => Promise<void> | void;
};

export type EventReactError = BaseErrorStrategy & {
    shouldReenqueue?: boolean;
};

export type TimeBasedError = BaseErrorStrategy;

export type ErrorHandlingStrategy = BaseErrorStrategy;
