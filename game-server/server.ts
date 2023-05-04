import express from "express";
import http from "http";
import cors from "cors";
import { Server, Socket } from "socket.io";
import { HalfBlindChess } from "halfblindchess";
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
db.set("812dj13f", new HalfBlindChess());
db.set("affe9jk3", new HalfBlindChess());

app.use(cors());

app.get("/game", (req, res) => {
    res.send(Array.from(db.keys()));
});

io.on("connection", (socket: Socket) => {
    console.log("A user connected.");
    socket.on("game", ({ gameId }) => {
        emitGameState(gameId);
    });

    socket.on("move", ({ gameId, orig, dest }) => {
        console.log(`received move: ${orig} to ${dest}`);
        const moveRes = db.get(gameId).move({ from: orig, to: dest });
        if (moveRes) {
            console.log(`good moveRes: ${JSON.stringify(moveRes)}`)
            emitGameState(gameId); // optimize: updateGameState
        } else {
            console.log(`bad moveRes: ${JSON.stringify(moveRes)}`)
        }
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected.");
    });
});

function emitGameState(gameId: string) {
    const hbchess = db.get(gameId);
    const gameState: StringifiableGameState = {
        fen: hbchess.halfBlindFen(),
        dests: JSON.stringify(Array.from(toDests(hbchess))),
        color: toColor(hbchess)
    };
    console.log(`emitting gameState: ${JSON.stringify(gameState)}`);
    io.emit("gameState", gameState);
}

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
