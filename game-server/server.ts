import express from "express";
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
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
    },
});

app.use(cors());
app.use(morganMiddleware);

registerGameEndpoints(app, redisClient);

io.on("connection", (socket: Socket) => {
    logger.info("A user connected.");

    registerGameSocketHandlers(io, socket, redisClient);

    socket.on("disconnect", () => {
        logger.info("A user disconnected.");
    });
});

server.listen(3000, () => {
    logger.info(`server is listening on port 3000`);
});
