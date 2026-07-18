import { describe, it, expect } from "vitest";
import { pairUp } from "../../src/utils/moveHistory";
import { MoveView } from "../../types/gameTypes";

const w = (san: string): MoveView => ({ san, piece: "p", color: "w", halfBlind: false, hidden: false });
const b = (san: string): MoveView => ({ san, piece: "p", color: "b", halfBlind: false, hidden: false });

describe("pairUp", () => {
    it("returns no rows for empty history", () => {
        expect(pairUp([])).toEqual([]);
    });
    it("pairs white+black moves into numbered rows", () => {
        const rows = pairUp([w("e4"), b("e5"), w("Nf3"), b("Nc6")]);
        expect(rows).toEqual([
            { n: 1, w: w("e4"), b: b("e5") },
            { n: 2, w: w("Nf3"), b: b("Nc6") },
        ]);
    });
    it("leaves black undefined when white has just moved", () => {
        const rows = pairUp([w("e4"), b("e5"), w("Nf3")]);
        expect(rows).toHaveLength(2);
        expect(rows[1]).toEqual({ n: 1 + 1, w: w("Nf3"), b: undefined });
    });
    it("numbers rows sequentially", () => {
        const rows = pairUp([w("a"), b("b"), w("c"), b("d"), w("e")]);
        expect(rows.map((r) => r.n)).toEqual([1, 2, 3]);
    });
});
