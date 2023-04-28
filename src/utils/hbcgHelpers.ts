import { Api } from "halfblindchessground/api";
import { Color, Key } from "halfblindchessground/types";
import { HalfBlindChess } from "halfblindchess";
import { Chessground } from "halfblindchessground";

function toDests(chess: HalfBlindChess): Map<Key, Key[]> {
    const dests = new Map();
    chess.SQUARES.forEach((s) => {
        const ms = chess.moves({ square: s, verbose: true });
        if (ms.length)
            dests.set(
                s,
                ms.map((m) => m.to)
            );
    });
    return dests;
}

function toColor(chess: any): Color {
    return chess.turn() === "w" ? "white" : "black";
}

function playOtherSide(cg: Api, chess: any) {
    return (orig: any, dest: any) => {
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

export function setupBoard(ref: any) {
    const chess = new HalfBlindChess();
    const cg = Chessground(ref, {
        movable: {
            color: "white",
            free: false,
            dests: toDests(chess),
        },
        draggable: {
            showGhost: true,
        },
    });
    cg.set({
        movable: {
            events: {
                after: playOtherSide(cg, chess),
            },
        },
    });
}