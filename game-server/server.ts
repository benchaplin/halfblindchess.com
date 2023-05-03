import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { HalfBlindChess } from "halfblindchess";
import { StringifiableGameState } from "../types/gameTypes";
import { toColor, toDests } from './hbcHelpers';

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
    emitGameState(socket);

    socket.on('move', ({ orig, dest }) => {
        console.log(`received move: ${orig} to ${dest}`);
        const moveRes = hbchess.move({ from: orig, to: dest });
        if (moveRes) {
            console.log(`good moveRes: ${JSON.stringify(moveRes)}`)
            emitGameState(socket); // optimize: updateGameState
        } else {
            console.log(`bad moveRes: ${JSON.stringify(moveRes)}`)
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected.');
    });
});

function emitGameState(socket: Socket) {
    const gameState: StringifiableGameState = {
        fen: hbchess.halfBlindFen(),
        dests: JSON.stringify(Array.from(toDests(hbchess))),
        color: toColor(hbchess)
    };
    console.log(`emitting gameState: ${JSON.stringify(gameState)}`);
    socket.emit('gameState', gameState);
}

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
