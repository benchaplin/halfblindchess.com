import { Api } from "halfblindchessground/api";
import { Color, Key } from "halfblindchessground/types";
import { Chessground } from "halfblindchessground";
import { Socket } from "socket.io-client";
import { HalfBlindChess, Move, Square } from "halfblindchess";
import { GameState } from "../../types/gameTypes";

export function setupBoardDefault(ref: HTMLElement) {
    const hbchess = new HalfBlindChess();
    const cg = Chessground(ref, {
        movable: {
            color: "white",
            free: false,
            dests: toDests(hbchess),
        },
        highlight: {
            check: true,
        },
        draggable: {
            showGhost: true,
        },
    });
    cg.set({
        movable: {
            events: {
                after: playOtherSideDefault(cg, hbchess),
            },
        },
    });
}

export function playOtherSideDefault(cg: Api, chess: HalfBlindChess) {
    return (orig: Square, dest: Square) => {
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
                dests: toDests(chess),
            },
        });
    };
}

function toDests(chess: HalfBlindChess): Map<Key, Key[]> {
    const dests = new Map();
    chess.SQUARES.forEach((square: Square) => {
        const moves = chess.moves({ square, verbose: true });
        if (moves.length)
            dests.set(
                square,
                moves.map((move: Move) => move.to)
            );
    });
    return dests;
}

function toColor(chess: HalfBlindChess): Color {
    return chess.turn() === "w" ? "white" : "black";
}

export function setupBoard(
    ref: HTMLElement,
    gameState: GameState,
    orientation: Color,
    viewOnly: boolean
): Api {
    const normalFen = gameState.fen.split(" ").slice(1).join(" ");
    const cg = Chessground(ref, {
        orientation,
        fen: normalFen,
        turnColor: gameState.turn,
        check: gameState.isCheck,
        viewOnly,
        movable: {
            color: gameState.turn,
            free: false,
            dests: gameState.dests,
        },
        highlight: {
            check: true,
        },
        draggable: {
            showGhost: true,
        },
    });

    if (gameState.fen.split(" ")[0].length > 1) {
        // half-blind move
        const fromSquare = gameState.fen.substring(0, 2) as Key;
        const piece = cg.state.pieces.get(fromSquare);
        cg.state.pieces.set(fromSquare, { ...piece, halfBlind: true });
    }
    return cg;
}

export function setupAfterMoveEvt(
    cg: Api,
    socket: Socket,
    gameId: string,
    playerId: string
) {
    cg.set({
        movable: {
            events: {
                after: playOtherSide(socket, gameId, playerId),
            },
        },
    });
}

function playOtherSide(socket: Socket, gameId: string, playerId: string) {
    return (orig: Key, dest: Key) => {
        console.log(`player ${playerId} emitting move: ${orig} to ${dest}`);
        socket.emit("move", { gameId, playerId, orig, dest });
    };
}
