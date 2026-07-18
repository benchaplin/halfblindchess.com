// Format a millisecond duration as a chess clock: mm:ss normally, but
// seconds.tenths once under 10 seconds. Never negative.
export function formatClock(ms: number): string {
    ms = Math.max(0, ms);
    if (ms < 10_000) {
        const s = Math.floor(ms / 1000);
        const tenths = Math.floor((ms % 1000) / 100);
        return `${s}.${tenths}`;
    }
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}
