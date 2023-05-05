import express, { Response } from "express";
import http from "http";
import cors from "cors";
import { logger, morganMiddleware } from "./logger";
import { Server, Socket } from "socket.io";
import { HalfBlindChess } from "halfblindchess";
import { v4 as uuidv4 } from 'uuid';
import { StringifiableGameState } from "../types/gameTypes";
import { toColor, toDests } from "./hbcHelpers";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173"
    }
});

const PORT = 3000;

const db = new Map();

app.use(cors());
app.use(morganMiddleware);

app.get("/game", (_, res: Response) => {
    res.send(Array.from(db.keys()));
});
app.post("/game", (_, res: Response) => {
    const gameId = uuidv4().split("-")[0];
    db.set(gameId, new HalfBlindChess());
    logger.info(`created game with ID ${gameId}`);
    res.send({ gameId });
});

io.on("connection", (socket: Socket) => {
    logger.info("A user connected.");
    socket.on("game", ({ gameId }) => {
        socket.join(gameId);
        emitGameState(gameId);
    });

    socket.on("move", ({ gameId, orig, dest }) => {
        logger.info(`received move for ${gameId}: ${orig} to ${dest}`);
        const moveRes = db.get(gameId).move({ from: orig, to: dest });
        if (moveRes) {
            logger.info(`good moveRes for ${gameId}: ${JSON.stringify(moveRes)}`)
            emitGameState(gameId); // optimize: updateGameState
        } else {
            logger.info(`bad moveRes for ${gameId}: ${JSON.stringify(moveRes)}`)
        }
    });

    socket.on("disconnect", () => {
        logger.info("A user disconnected.");
    });
});

function emitGameState(gameId: string) {
    const hbchess = db.get(gameId);
    const gameState: StringifiableGameState = {
        fen: hbchess.halfBlindFen(),
        dests: JSON.stringify(Array.from(toDests(hbchess))),
        color: toColor(hbchess)
    };
    logger.info(`emitting gameState for ${gameId}: ${JSON.stringify(gameState)}`);
    io.to(gameId).emit("gameState", gameState);
}

server.listen(PORT, () => {
    logger.info(`Server is listening on port ${PORT}`);
});
