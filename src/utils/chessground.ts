import { Api } from "halfblindchessground/api";
import { Color, Key } from "halfblindchessground/types";
import { ChessInstance, Move, Square } from "chess.js";

export function toDests(chess: ChessInstance): Map<Key, Key[]> {
    const dests = new Map();
    chess.SQUARES.forEach((s: Square) => {
        const ms = chess.moves({ square: s, verbose: true });
        if (ms.length)
            dests.set(
                s,
                ms.map((m: Move) => m.to)
            );
    });
    return dests;
}

export function toColor(chess: ChessInstance): Color {
    return chess.turn() === "w" ? "white" : "black";
}

export function playOtherSide(cg: Api, chess: ChessInstance, gid: string, moveMut: Function): any {
    return (orig: Square, dest: Square) => {
        const move: any = chess.move({ from: orig, to: dest });
        moveMut({ id: gid, fen: chess.fen() });
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