import { describe, it, expect } from "vitest";
import { HalfBlindChess } from "halfblindchess";
import {
    halfBlindMoveFromFen,
    isHalfBlindDisplay,
} from "../../src/utils/halfblind";

describe("halfBlindMoveFromFen", () => {
    it("parses digit prefixes and the display state", () => {
        const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        expect(halfBlindMoveFromFen(`2 ${fen}`)).toBe(2);
        expect(halfBlindMoveFromFen(`1 ${fen}`)).toBe(1);
        expect(halfBlindMoveFromFen(`0 ${fen}`)).toBe(0);
        expect(halfBlindMoveFromFen(`e7e5 ${fen}`)).toBe(2); // display -> next is 2 away
    });

    // The crux of the fade-in-place fix: the board's halfBlindMove must be 0
    // exactly on the move that is about to be half-blind.
    it("is 0 precisely before each half-blind move (engine-driven)", () => {
        const hb = new HalfBlindChess();
        const moves: [string, string][] = [
            ["e2", "e4"], ["e7", "e5"],
            ["g1", "f3"], ["b8", "c6"],
            ["f1", "c4"], ["f8", "c5"],
        ];
        for (const [from, to] of moves) {
            const predictedHalfBlind = halfBlindMoveFromFen(hb.halfBlindFen()) === 0;
            const res = hb.move({ from, to });
            expect(predictedHalfBlind).toBe(!!res.halfBlind);
        }
    });

    it("isHalfBlindDisplay flags the hidden display state", () => {
        const hb = new HalfBlindChess();
        hb.move({ from: "e2", to: "e4" });
        expect(isHalfBlindDisplay(hb.halfBlindFen())).toBe(false);
        hb.move({ from: "e7", to: "e5" }); // black's first move: half-blind
        expect(isHalfBlindDisplay(hb.halfBlindFen())).toBe(true);
    });
});
