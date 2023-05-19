import { Application, Request, Response } from "express";
import { logger } from "../logger";
import { Server, Socket } from "socket.io";
import { RedisClientType } from "redis";
import { HalfBlindChess, DEFAULT_HB_POSITION } from "halfblindchess";
import { v4 as uuidv4 } from "uuid";
import { toColor, toDests } from "../hbcHelpers";
import { Game } from "../../types/gameTypes";

export function registerGameEndpoints(
    app: Application,
    redisClient: RedisClientType<any, any, any>
) {
    // get all games
    app.get("/api/game", async (_, res: Response) => {
        res.send(Array.from(await redisClient.keys("*")));
    });

    // create game
    app.post("/api/game", async (req: Request, res: Response) => {
        const gameId = uuidv4().split("-")[0];
        const player1Id = req.body.playerId;
        const game: Game = {
            player1Id,
            fen: DEFAULT_HB_POSITION,
        };
        try {
            await redisClient.set(gameId, JSON.stringify(game));
            logger.info(`created game ${gameId}`);
            res.send({ gameId, game });
        } catch (err) {
            logger.error(`error creating game ${gameId}: ${err}`);
            throw err;
        }
    });
}

export default function registerGameSocketHandlers(
    io: Server,
    socket: Socket,
    redisClient: RedisClientType<any, any, any>
) {
    // join game room
    // send game state to socket
    socket.on("joinGame", async ({ gameId, playerId }) => {
        socket.join(gameId);
        try {
            const gameStr = await redisClient.get(gameId);
            if (gameStr === null) {
                throw new Error(`key ${gameId} not found in redis`);
            }
            let game: Game = JSON.parse(gameStr);
            const hbchess = new HalfBlindChess(game.fen);

            // if player2 is not set, you are player2
            if (!game.player2Id && game.player1Id !== playerId) {
                game = { ...game, player2Id: playerId };
                redisClient.set(gameId, JSON.stringify(game));
                emitGameState(gameId, game, hbchess); // tell everyone
            } else {
                sendGameState(gameId, game, hbchess);
            }
        } catch (err) {
            logger.error(`error fetching game ${gameId}: ${err}`);
            throw err;
        }
    });

    // make move in game
    // emit game state to game room
    socket.on("move", async ({ gameId, playerId, orig, dest }) => {
        logger.info(
            `received move from ${playerId} for ${gameId}: ${orig} to ${dest}`
        );
        try {
            const gameStr = await redisClient.get(gameId);
            if (gameStr === null) {
                throw new Error(`key ${gameId} not found in redis`);
            }
            const game: Game = JSON.parse(gameStr);
            const hbchess = new HalfBlindChess(game.fen);

            // only the right player can move
            if (
                !(hbchess.turn() === "w" && playerId === game.player1Id) &&
                !(hbchess.turn() === "b" && playerId === game.player2Id)
            ) {
                // TODO: don't crash here
                throw new Error(
                    `player ${playerId} is not allowed to move at this time in game ${gameId}`
                );
            }

            const moveRes = hbchess.move({ from: orig, to: dest });
            if (moveRes) {
                logger.info(
                    `good moveRes for ${gameId}: ${JSON.stringify(moveRes)}`
                );
                const newFen = hbchess.halfBlindFen();
                await redisClient.set(
                    gameId,
                    JSON.stringify({ ...game, fen: newFen })
                );
                logger.info(`updated game ${gameId} to fen ${newFen}`);
                emitGameState(gameId, game, hbchess);
            } else {
                logger.info(
                    `bad moveRes for ${gameId}: ${JSON.stringify(moveRes)}`
                );
            }
        } catch (err) {
            logger.error(`error moving in game ${gameId}: ${err}`);
            throw err;
        }
    });

    function emitGameState(
        gameId: string,
        game: Game,
        hbchess: HalfBlindChess
    ) {
        const gameState = {
            player1Id: game.player1Id,
            player2Id: game.player2Id,
            fen: hbchess.halfBlindFen(),
            dests: JSON.stringify(Array.from(toDests(hbchess))),
            color: toColor(hbchess),
        };
        logger.info(
            `emitting gameState for ${gameId}: ${JSON.stringify(gameState)}`
        );
        io.to(gameId).emit("gameState", gameState);
    }

    function sendGameState(
        gameId: string,
        game: Game,
        hbchess: HalfBlindChess
    ) {
        const gameState = {
            player1Id: game.player1Id,
            player2Id: game.player2Id,
            fen: hbchess.halfBlindFen(),
            dests: JSON.stringify(Array.from(toDests(hbchess))),
            color: toColor(hbchess),
        };
        logger.info(
            `sending gameState for ${gameId}: ${JSON.stringify(gameState)}`
        );
        socket.emit("gameState", gameState);
    }
}
