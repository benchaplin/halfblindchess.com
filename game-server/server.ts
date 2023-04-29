import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { HalfBlindChess } from "halfblindchess";

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
    console.log(`emitting gameState, color: ${toColor(hbchess)}, fen: ${hbchess.fen()}`)
    socket.emit('gameState', {
        fen: hbchess.fen(),
        dests: JSON.stringify(Array.from(toDests(hbchess))),
        color: toColor(hbchess),
    })

    socket.on('move', ({ orig, dest }) => {
        console.log(`received move: ${orig} to ${dest}`);
        const moveRes = hbchess.move({ from: orig, to: dest });
        if (moveRes) {
            console.log(`good moveRes: ${JSON.stringify(moveRes)}`)
            console.log(`emitting gameState, color: ${toColor(hbchess)}, fen: ${hbchess.fen()}`)
            socket.emit('gameState', { // dupe code
                fen: hbchess.fen(),
                dests: JSON.stringify(Array.from(toDests(hbchess))),
                color: toColor(hbchess)
            })
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

function toColor(hbchess: HalfBlindChess): string {
    return hbchess.turn() === "w" ? "white" : "black";
}