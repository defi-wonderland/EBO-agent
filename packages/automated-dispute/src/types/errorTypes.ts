export type BaseErrorStrategy = {
    shouldNotify: boolean;
    shouldTerminate: boolean;
    shouldReenqueue: boolean;
    customAction?: (context: any) => Promise<void> | void;
};

export type EventReactError = BaseErrorStrategy & {
    shouldReenqueue?: boolean;
};

export type TimeBasedError = BaseErrorStrategy;

export type ErrorHandlingStrategy = BaseErrorStrategy;
