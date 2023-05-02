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
    const cg = Chessground(ref, {
        fen: gameState.fen,
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
    // cg.set({
    //     halfBlindMove: gameState.lastHalfBlindMove.halfBlind
    //         ? gameState.lastHalfBlindMove
    //         : typeof cg.state.halfBlindMove === "number"
    //             ? cg.state.halfBlindMove - 1
    //             : 1,
    // });
    // if (gameState.lastHalfBlindMove.halfBlind) {
    //     const piece = cg.state.pieces.get(gameState.lastHalfBlindMove.from);
    //     cg.state.pieces.set(gameState.lastHalfBlindMove.from, { ...piece, halfBlind: true });
    //     console.log(cg.state.pieces)
    // }
    return cg;
}

export function setupAfterMoveEvt(cg: Api, socket: Socket) {
    cg.set({
        movable: {
            events: {
                after: playOtherSide(cg, socket),
            },
        },
    });
}

function playOtherSide(cg: Api, socket: Socket) {
    return (orig: Key, dest: Key) => {
        console.log(`emitting move: ${orig} to ${dest}`)
        socket.emit('move', { orig, dest });
    };
}