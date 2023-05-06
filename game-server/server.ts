import express, { Response } from "express";
import http from "http";
import cors from "cors";
import { logger, morganMiddleware } from "./logger";
import { Server, Socket } from "socket.io";
import { CLIENT_URL } from "./constants";
import { createClient } from "redis";
import { HalfBlindChess, DEFAULT_HB_POSITION } from "halfblindchess";
import { v4 as uuidv4 } from 'uuid';
import { StringifiableGameState } from "../types/gameTypes";
import { toColor, toDests } from "./hbcHelpers";

// redis
const redisClient = createClient();
redisClient.connect();
redisClient.on('error', err => logger.error('redis client error', err));
redisClient.on('ready', () => logger.info("redis client connected on port 6379"));

// express/socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: CLIENT_URL
    }
});

app.use(cors());
app.use(morganMiddleware);

app.get("/api/game", async (_, res: Response) => {
    res.send(Array.from(await redisClient.keys('*')));
});

app.post("/api/game", async (_, res: Response) => {
    const gameId = uuidv4().split("-")[0];
    redisClient.set(gameId, DEFAULT_HB_POSITION)
        .then(() => {
            logger.info(`created game with ID ${gameId}`);
            res.send({ gameId });
        }).catch(err => {
            logger.error(`error creating game with ID ${gameId}: ${err}`);
            throw err;
        });
});

io.on("connection", (socket: Socket) => {
    logger.info("A user connected.");
    socket.on("game", ({ gameId }) => {
        socket.join(gameId);
        redisClient.get(gameId)
            .then((fen) => {
                if (fen === null)
                    throw new Error(`key ${gameId} not found in redis`);
                const hbchess = new HalfBlindChess(fen);
                emitGameState(gameId, hbchess);
            })
            .catch(err => {
                logger.error(`error fetching game with ID ${gameId}: ${err}`);
                throw err;
            });
    });

    socket.on("move", ({ gameId, orig, dest }) => {
        logger.info(`received move for ${gameId}: ${orig} to ${dest}`);
        redisClient.get(gameId)
            .then((fen) => {
                if (fen === null)
                    throw new Error(`key ${gameId} not found in redis`);
                const hbchess = new HalfBlindChess(fen);
                const moveRes = hbchess.move({ from: orig, to: dest });
                if (moveRes) {
                    logger.info(`good moveRes for ${gameId}: ${JSON.stringify(moveRes)}`);
                    const newFen = hbchess.halfBlindFen();
                    redisClient.set(gameId, newFen)
                        .then(() => {
                            logger.info(`updated game with ID ${gameId} to fen ${newFen}`);
                            emitGameState(gameId, hbchess); // optimize: updateGameState
                        }).catch(err => {
                            logger.error(`error creating game with ID ${gameId}: ${err}`);
                            throw err;
                        });
                } else {
                    logger.info(`bad moveRes for ${gameId}: ${JSON.stringify(moveRes)}`)
                }
            })
            .catch(err => {
                logger.error(`error fetching game with ID ${gameId}: ${err}`);
                throw err;
            });
    });

    socket.on("disconnect", () => {
        logger.info("A user disconnected.");
    });
});

function emitGameState(gameId: string, hbchess: HalfBlindChess) {
    const gameState: StringifiableGameState = {
        fen: hbchess.halfBlindFen(),
        dests: JSON.stringify(Array.from(toDests(hbchess))),
        color: toColor(hbchess)
    };
    logger.info(`emitting gameState for ${gameId}: ${JSON.stringify(gameState)}`);
    io.to(gameId).emit("gameState", gameState);
}

server.listen(3000, () => {
    logger.info(`server is listening on port 3000`);
});
