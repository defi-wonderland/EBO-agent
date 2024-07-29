import { createLogger, format, transports, Logger as WinstonLogger } from "winston";

import { ILogger, LogLevel } from "./index.js";

export class Logger implements ILogger {
    private logger: WinstonLogger;
    private static instance: Logger | null;

    private constructor(private level: LogLevel) {
        this.logger = createLogger({
            level: this.level,
            format: format.combine(
                format.colorize(),
                format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                format.errors({ stack: true }),
                format.printf(({ level, message, timestamp, stack }) => {
                    return `${timestamp} ${level}: ${stack || message}`;
                }),
            ),
            transports: [new transports.Console()],
        });
    }
    /**
     * Returns the instance of the Logger class.
     * @param level The log level to be used by the logger.
     * @returns The instance of the Logger class.
     */
    public static getInstance(level?: LogLevel): Logger {
        if (!Logger.instance) {
            if (!level) {
                throw new Error("Initial configuration is required for the first instantiation.");
            }
            Logger.instance = new Logger(level);
        } else {
            Logger.instance.warn(
                `Logger instance already exists. Returning the existing instance with log level ${Logger.instance.level}.`,
            );
        }

        return Logger.instance;
    }

    info(message: string) {
        this.logger.info(message);
    }
    error(error: Error | string): void {
        if (error instanceof Error) {
            this.logger.error(error);
        } else {
            this.logger.error(new Error(error));
        }
    }
    warn(message: string) {
        this.logger.warn(message);
    }
    debug(message: string) {
        this.logger.debug(message);
    }
}
