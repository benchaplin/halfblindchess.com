type NameBadgeProps = {
    name?: string;
    color: "red" | "green";
    winner?: boolean;
    connected?: boolean; // undefined = unknown (no dot)
};

export default function NameBadge({
    name,
    color,
    winner,
    connected,
}: NameBadgeProps) {
    // A nameplate, not a control: bordered like the buttons, but with a soft
    // fill and a colored left accent tied to the player so the two read apart.
    const accent =
        color === "red" ? "border-l-rose-500" : "border-l-emerald-600";
    return (
        <div
            className={`inline-flex items-center gap-2 bg-stone-100 border border-solid border-slate-800 border-l-4 ${accent} rounded px-3 py-1.5`}
        >
            {connected !== undefined && (
                <span
                    className={`inline-block w-2 h-2 rounded-full ${
                        connected ? "bg-emerald-500" : "bg-stone-400"
                    }`}
                    title={connected ? "online" : "offline"}
                />
            )}
            <img src={`../avatar_${color}.svg`} width="20" alt="" />
            <span className={name ? "font-bold" : "italic text-stone-500"}>
                {name || "waiting for opponent..."}
            </span>
            {winner && <img src="../trophy.svg" width="22" alt="" />}
        </div>
    );
}
