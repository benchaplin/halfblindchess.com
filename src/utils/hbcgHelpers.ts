import { Api } from "halfblindchessground/api";
import { Color, Key } from "halfblindchessground/types";
import { Chessground } from "halfblindchessground";
import { Socket } from "socket.io-client";
import { HalfBlindChess } from "halfblindchess";
import { GameState } from "../../types/gameTypes";

export function setupBoardDefault(ref: HTMLElement) {
    const chess = new HalfBlindChess();
    const cg = Chessground(ref, {
        movable: {
            color: 'white',
            free: false,
            dests: toDests(chess),
        },
        draggable: {
            showGhost: true
        }
    });
    cg.set({
        movable: {
            events: {
                after: playOtherSideDefault(cg, chess)
            }
        }
    });
}

export function playOtherSideDefault(cg: Api, chess: any) {
    return (orig, dest) => {
        const move = chess.move({ from: orig, to: dest });
        cg.set({
            halfBlindMove: move.halfBlind
                ? move
                : typeof cg.state.halfBlindMove === "number"
                    ? cg.state.halfBlindMove - 1
                    : 1,
        });
        cg.set({
            turnColor: toColor(chess),
            movable: {
                color: toColor(chess),
                dests: toDests(chess)
            }
        });
    };
}

function toDests(chess: any): Map<Key, Key[]> {
    const dests = new Map();
    chess.SQUARES.forEach(s => {
        const ms = chess.moves({ square: s, verbose: true });
        if (ms.length) dests.set(s, ms.map(m => m.to));
    });
    return dests;
}

function toColor(chess: any): Color {
    return (chess.turn() === 'w') ? 'white' : 'black';
}

export function setupBoard(ref: HTMLElement, gameState: GameState): Api {
    const realFen = gameState.fen.startsWith("h") ? gameState.fen.substring(4) : gameState.fen;
    const cg = Chessground(ref, {
        fen: realFen,
        turnColor: gameState.color,
        movable: {
            color: gameState.color,
            free: false,
            dests: gameState.dests,
        },
        draggable: {
            showGhost: true,
        }
    });
    if (gameState.fen.startsWith("h")) {
        const square = gameState.fen.substring(1, 3) as Key;
        const piece = cg.state.pieces.get(square);
        cg.state.pieces.set(square, { ...piece, halfBlind: true });
        console.log(cg.state.pieces)
    }
    return cg;
}

export function setupAfterMoveEvt(cg: Api, socket: Socket, gameId: string) {
    cg.set({
        movable: {
            events: {
                after: playOtherSide(socket, gameId),
            },
        },
    });
}

function playOtherSide(socket: Socket, gameId: string) {
    return (orig: Key, dest: Key) => {
        console.log(`emitting move: ${orig} to ${dest}`)
        socket.emit('move', { gameId, orig, dest });
    };
}