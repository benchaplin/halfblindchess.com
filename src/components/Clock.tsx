import { useEffect, useState } from "react";

type ClockProps = {
    timeMs: number; // live remaining as of the last server update
    active: boolean; // is this player's clock running?
};

function format(ms: number): string {
    ms = Math.max(0, ms);
    if (ms < 10_000) {
        // under 10 seconds: show tenths
        const s = Math.floor(ms / 1000);
        const tenths = Math.floor((ms % 1000) / 100);
        return `${s}.${tenths}`;
    }
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Clock({ timeMs, active }: ClockProps) {
    // Anchor on the server value and each received update, then interpolate
    // locally so the countdown ticks without further server traffic.
    const [display, setDisplay] = useState(timeMs);

    useEffect(() => {
        setDisplay(timeMs);
        if (!active) return;
        const start = Date.now();
        const id = setInterval(() => {
            setDisplay(Math.max(0, timeMs - (Date.now() - start)));
        }, 100);
        return () => clearInterval(id);
    }, [timeMs, active]);

    return (
        <span
            className={`inline-block font-mono text-xl px-3 py-1 rounded border border-solid border-slate-800 ${
                active ? "bg-white" : "bg-stone-200"
            } ${display <= 0 ? "text-red-600" : ""}`}
        >
            {format(display)}
        </span>
    );
}
