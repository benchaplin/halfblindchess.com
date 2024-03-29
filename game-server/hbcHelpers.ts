import { Color, Key } from "halfblindchessground/types";
import { HalfBlindChess, HalfBlindMove, Square } from "halfblindchess";

export function toDests(hbchess: HalfBlindChess): Map<Key, Key[]> {
    const dests = new Map();
    hbchess.SQUARES.forEach((sq: Square) => {
        const moves = hbchess.moves({ square: sq, verbose: true });
        if (moves.length)
            dests.set(
                sq,
                moves.map((mv) => mv.to)
            );
    });
    return dests;
}

export function toColor(hbchess: HalfBlindChess): Color {
    return hbchess.turn() === "w" ? "white" : "black";
}
