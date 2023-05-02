import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { HalfBlindChess, HalfBlindMove } from "halfblindchess";
import { StringifiableGameState } from "../types/gameTypes";
import { Color } from 'halfblindchessground/types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173"
    }
});

const PORT = 3000;

const hbchess = new HalfBlindChess();

io.on('connection', (socket: Socket) => {
    console.log('A user connected.');
    const gameState: StringifiableGameState = {
        fen: hbchess.fen(),
        dests: JSON.stringify(Array.from(toDests(hbchess))),
        color: toColor(hbchess),
        lastHalfBlindMove: getLastHalfBlindMove(hbchess)
    };
    console.log(`emitting gameState: ${JSON.stringify(gameState)}`);
    socket.emit('gameState', gameState);

    socket.on('move', ({ orig, dest }) => {
        console.log(`received move: ${orig} to ${dest}`);
        const moveRes = hbchess.move({ from: orig, to: dest });
        if (moveRes) {
            console.log(`good moveRes: ${JSON.stringify(moveRes)}`)
            // dupe code
            const gameState: StringifiableGameState = {
                fen: hbchess.fen(),
                dests: JSON.stringify(Array.from(toDests(hbchess))),
                color: toColor(hbchess),
                lastHalfBlindMove: getLastHalfBlindMove(hbchess)
            };
            console.log(`emitting gameState: ${JSON.stringify(gameState)}`);
            socket.emit('gameState', gameState); // optimize: updateGameState
        } else {
            console.log(`bad moveRes: ${JSON.stringify(moveRes)}`)
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected.');
    });
});

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

function toDests(hbchess: HalfBlindChess): Map<string, string[]> {
    const dests = new Map();
    hbchess.SQUARES.forEach((sq) => {
        const moves = hbchess.moves({ square: sq, verbose: true });
        if (moves.length)
            dests.set(
                sq,
                moves.map((mv) => mv.to)
            );
    });
    return dests;
}

function toColor(hbchess: HalfBlindChess): Color {
    return hbchess.turn() === "w" ? "white" : "black";
}

function getLastHalfBlindMove(hbchess: HalfBlindChess): HalfBlindMove {
    const history = hbchess.history({ verbose: true });
    const lastMove = history[history.length - 1];

    return { ...lastMove, halfBlind: hbchess.lastMoveHalfBlind() };
}