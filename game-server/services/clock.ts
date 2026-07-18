// Server-authoritative flag-fall scheduling.
//
// Rather than ticking every game every second (which would burn a single CPU
// core), each active game holds at most one pending timer: a setTimeout that
// fires only if the player on move runs out of time before making a move. The
// timer is rescheduled on every move and cleared when the game ends. Between
// moves the server does no clock work at all; the browser interpolates the
// visible countdown locally.

const flagTimers = new Map<string, NodeJS.Timeout>();

// Schedule (or reschedule) the flag-fall for a game. `ms` is the live time
// remaining for the player currently on move.
export function scheduleFlagFall(
    gameId: string,
    ms: number,
    cb: () => void
): void {
    clearFlagFall(gameId);
    const timer = setTimeout(() => {
        flagTimers.delete(gameId);
        cb();
    }, Math.max(0, ms));
    flagTimers.set(gameId, timer);
}

export function clearFlagFall(gameId: string): void {
    const timer = flagTimers.get(gameId);
    if (timer) {
        clearTimeout(timer);
        flagTimers.delete(gameId);
    }
}

export function hasFlagFall(gameId: string): boolean {
    return flagTimers.has(gameId);
}
