import winston from "winston";
import morgan from "morgan";

const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};
winston.addColors(colors);

const myFormat = winston.format.combine(
    winston.format.label({ label: "game-server" }),
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ level, message, label, timestamp }) => {
        return `[${label}] ${timestamp} ${level}: ${message.trimEnd()}`;
    })
);

export const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(winston.format.timestamp(), myFormat),
    defaultMeta: { service: "game-server" },
    transports:
        process.env.NODE_ENV !== "production"
            ? [new winston.transports.Console({ level: "debug" })]
            : [
                  new winston.transports.File({
                      filename: "error.log",
                      level: "error",
                  }),
                  new winston.transports.File({ filename: "combined.log" }),
              ],
});

const stream = {
    write: (message: string) => logger.http(message),
};

export const morganMiddleware = morgan("short", { stream });
