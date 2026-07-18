import { MoveView } from "../../types/gameTypes";

export type MoveRow = { n: number; w?: MoveView; b?: MoveView };

// Group a flat move list into numbered (white, black) rows.
export function pairUp(history: MoveView[]): MoveRow[] {
    const rows: MoveRow[] = [];
    for (const m of history) {
        if (m.color === "w") {
            rows.push({ n: rows.length + 1, w: m });
        } else if (rows.length > 0) {
            rows[rows.length - 1].b = m;
        } else {
            rows.push({ n: 1, b: m }); // shouldn't happen (white moves first)
        }
    }
    return rows;
}
