import { useEffect, useRef } from "react";
import { MoveView } from "../../types/gameTypes";
import { pairUp } from "../utils/moveHistory";

function Cell({ move }: { move?: MoveView }) {
    if (!move) return <span className="text-stone-400">·</span>;
    if (move.hidden) {
        // half-blind move still hidden: show which piece moved, not where
        return (
            <span className="italic text-stone-500" title="half-blind move">
                {move.piece.toUpperCase()}?
            </span>
        );
    }
    return (
        <span
            className={move.halfBlind ? "italic" : ""}
            title={move.halfBlind ? "was a half-blind move" : undefined}
        >
            {move.san}
        </span>
    );
}

export default function MoveHistory({ history }: { history: MoveView[] }) {
    const rows = pairUp(history);
    const scroller = useRef<HTMLDivElement>(null);

    // keep the latest move in view
    useEffect(() => {
        if (scroller.current) {
            scroller.current.scrollTop = scroller.current.scrollHeight;
        }
    }, [history.length]);

    return (
        <div className="w-[160px] h-[500px] flex flex-col border border-solid border-slate-800 rounded bg-stone-100 overflow-hidden">
            <div className="px-3 py-2 border-b border-solid border-slate-800 font-bold text-sm">
                Moves
            </div>
            <div ref={scroller} className="flex-1 overflow-y-auto text-sm">
                {rows.length === 0 ? (
                    <div className="px-3 py-2 italic text-stone-500">
                        No moves yet.
                    </div>
                ) : (
                    <table className="w-full">
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.n} className="odd:bg-stone-300/50">
                                    <td className="px-2 py-0.5 text-stone-500 w-7 text-right">
                                        {r.n}.
                                    </td>
                                    <td className="px-2 py-0.5">
                                        <Cell move={r.w} />
                                    </td>
                                    <td className="px-2 py-0.5">
                                        <Cell move={r.b} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
