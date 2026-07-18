import express from "express";
import bodyParser from "body-parser";
import http from "http";
import cors from "cors";
import { logger, morganMiddleware } from "./logger";
import { Server, Socket } from "socket.io";
import { CLIENT_URL } from "./constants";
import { createClient } from "redis";
import registerGameSocketHandlers, {
    registerGameEndpoints,
} from "./services/game";

// redis
const redisClient = createClient();
redisClient.connect();
redisClient.on("error", (err) => logger.error("redis client error", err));
redisClient.on("ready", () =>
    logger.info("redis client connected on port 6379")
);

// express/socket.io
const app = express();
// behind nginx in production: trust the first proxy so req.ip is the real
// client (needed for per-IP rate limiting)
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
    },
    // our messages are tiny; cap payloads so a client can't send megabytes
    maxHttpBufferSize: 16 * 1024, // 16 KB
});

app.use(bodyParser.json({ limit: "16kb" }));
app.use(cors({ origin: CLIENT_URL }));
app.use(morganMiddleware);

registerGameEndpoints(app, io, redisClient);

io.on("connection", (socket: Socket) => {
    logger.info("A user connected.");

    registerGameSocketHandlers(io, socket, redisClient);

    socket.on("disconnect", () => {
        logger.info("A user disconnected.");
    });
});

// Safety net: never let a stray async error take the whole server down.
process.on("unhandledRejection", (reason) => {
    logger.error(`unhandledRejection: ${reason}`);
});
process.on("uncaughtException", (err) => {
    logger.error(`uncaughtException: ${err}`);
});

server.listen(3000, () => {
    logger.info(`server is listening on port 3000`);
});
