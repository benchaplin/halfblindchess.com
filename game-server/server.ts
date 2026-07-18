import express from "express";
import bodyParser from "body-parser";
import http from "http";
import cors from "cors";
import { AddressInfo } from "net";
import { logger, morganMiddleware } from "./logger";
import { Server, Socket } from "socket.io";
import { RedisClientType } from "redis";
import { createClient } from "redis";
import { CLIENT_URL } from "./constants";
import registerGameSocketHandlers, {
    registerGameEndpoints,
} from "./services/game";

// re-exported so tests can build a redis client resolved from game-server's
// own node_modules (the root project doesn't depend on redis)
export { createClient } from "redis";

type Redis = RedisClientType<any, any, any>;

export type StartedServer = {
    server: http.Server;
    io: Server;
    redisClient: Redis;
    port: number;
    close: () => Promise<void>;
};

// Build and start the server. Exported so tests can boot it in-process on an
// ephemeral port with a throwaway Redis db.
export async function startServer(opts?: {
    port?: number;
    redisClient?: Redis;
}): Promise<StartedServer> {
    const redisClient = opts?.redisClient ?? (createClient() as Redis);
    if (!redisClient.isOpen) await redisClient.connect();

    const app = express();
    // behind nginx in production: trust the first proxy so req.ip is the real
    // client (needed for per-IP rate limiting)
    app.set("trust proxy", 1);
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: CLIENT_URL },
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

    await new Promise<void>((resolve) =>
        server.listen(opts?.port ?? 3000, resolve)
    );
    const port = (server.address() as AddressInfo).port;

    return {
        server,
        io,
        redisClient,
        port,
        close: async () => {
            await io.close();
            await new Promise<void>((resolve) => server.close(() => resolve()));
            if (redisClient.isOpen && !opts?.redisClient) await redisClient.quit();
        },
    };
}

// Run for real unless we're inside Vitest (which imports startServer directly).
if (!process.env.VITEST) {
    const redisClient = createClient() as Redis;
    redisClient.on("error", (err) => logger.error("redis client error", err));
    redisClient.on("ready", () =>
        logger.info("redis client connected on port 6379")
    );

    // Safety net: never let a stray async error take the whole server down.
    process.on("unhandledRejection", (reason) => {
        logger.error(`unhandledRejection: ${reason}`);
    });
    process.on("uncaughtException", (err) => {
        logger.error(`uncaughtException: ${err}`);
    });

    startServer({ port: 3000, redisClient }).then(() =>
        logger.info("server is listening on port 3000")
    );
}
