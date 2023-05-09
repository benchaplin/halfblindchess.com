import { Application, Response } from "express";
import { logger } from "../logger";
import { Server, Socket } from "socket.io";
import { RedisClientType, RedisDefaultModules } from "redis";
import { HalfBlindChess, DEFAULT_HB_POSITION } from "halfblindchess";
import { v4 as uuidv4 } from "uuid";
import { toColor, toDests } from "../hbcHelpers";

export function registerGameEndpoints(
    app: Application,
    redisClient: RedisClientType<any, any, any>
) {
    app.get("/api/game", async (_, res: Response) => {
        res.send(Array.from(await redisClient.keys("*")));
    });

    app.post("/api/game", async (_, res: Response) => {
        const gameId = uuidv4().split("-")[0];
        try {
            await redisClient.set(gameId, DEFAULT_HB_POSITION);
            logger.info(`created game with ID ${gameId}`);
            res.send({ gameId });
        } catch (err) {
            logger.error(`error creating game with ID ${gameId}: ${err}`);
            throw err;
        }
    });
}

export default function registerGameSocketHandlers(
    io: Server,
    socket: Socket,
    redisClient: RedisClientType<any, any, any>
) {
    socket.on("game", async ({ gameId }) => {
        socket.join(gameId);
        try {
            const fen = await redisClient.get(gameId);
            if (fen === null) {
                throw new Error(`key ${gameId} not found in redis`);
            }
            const hbchess = new HalfBlindChess(fen);
            emitGameState(gameId, hbchess);
        } catch (err) {
            logger.error(`error fetching game with ID ${gameId}: ${err}`);
            throw err;
        }
    });

    socket.on("move", async ({ gameId, orig, dest }) => {
        logger.info(`received move for ${gameId}: ${orig} to ${dest}`);
        try {
            const fen = await redisClient.get(gameId);
            if (fen === null) {
                throw new Error(`key ${gameId} not found in redis`);
            }
            const hbchess = new HalfBlindChess(fen);
            const moveRes = hbchess.move({ from: orig, to: dest });
            if (moveRes) {
                logger.info(
                    `good moveRes for ${gameId}: ${JSON.stringify(moveRes)}`
                );
                const newFen = hbchess.halfBlindFen();
                await redisClient.set(gameId, newFen);
                logger.info(`updated game with ID ${gameId} to fen ${newFen}`);
                emitGameState(gameId, hbchess);
            } else {
                logger.info(
                    `bad moveRes for ${gameId}: ${JSON.stringify(moveRes)}`
                );
            }
        } catch (err) {
            logger.error(`error fetching game with ID ${gameId}: ${err}`);
            throw err;
        }
    });

    function emitGameState(gameId: string, hbchess: HalfBlindChess) {
        const gameState = {
            fen: hbchess.halfBlindFen(),
            dests: JSON.stringify(Array.from(toDests(hbchess))),
            color: toColor(hbchess),
        };
        logger.info(
            `emitting gameState for ${gameId}: ${JSON.stringify(gameState)}`
        );
        io.to(gameId).emit("gameState", gameState);
    }
}
