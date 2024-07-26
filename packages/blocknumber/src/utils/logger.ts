import winston from "winston";

const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    defaultMeta: { service: "blocknumber" },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
            silent: process.env.NODE_ENV == "test",
        }),
    ],
});

export default logger;
