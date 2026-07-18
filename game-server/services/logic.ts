// Pure, dependency-light game logic — no Redis, sockets, or engine state.
// Extracted from game.ts so it can be unit-tested in isolation.

import { Square } from "halfblindchess";
import { Color } from "halfblindchessground/types";
import { Game, MoveRecord, MoveView, TimeControl } from "../../types/gameTypes";

export const DEFAULT_TIME_CONTROL: TimeControl = { base: 300_000, increment: 0 };
export const MAX_BASE = 60 * 60_000; // 60 min
export const MAX_INCREMENT = 60_000; // 60 s
export const MAX_USERNAME_LEN = 20;
export const MAX_ID_LEN = 64;

// ---------------------------------------------------------------------------
// Input validation / sanitizing (all socket + REST input is untrusted)
// ---------------------------------------------------------------------------

// Ids we mint are 8 hex chars; accept a little slack but keep them key-safe
// and bounded so a client can't smuggle huge strings into keys/room names.
export const isValidGameId = (id: unknown): id is string =>
    typeof id === "string" && /^[a-zA-Z0-9]{1,32}$/.test(id);

export const sanitizeId = (id: unknown): string | null =>
    typeof id === "string" && id.length > 0 && id.length <= MAX_ID_LEN
        ? id
        : null;

export const sanitizeUsername = (u: unknown): string | undefined =>
    typeof u === "string"
        ? u.trim().slice(0, MAX_USERNAME_LEN) || undefined
        : undefined;

export const isSquare = (s: unknown): s is Square =>
    typeof s === "string" && /^[a-h][1-8]$/.test(s);

export function normalizeTimeControl(tc: any): TimeControl {
    const base = Number(tc?.base);
    const increment = Number(tc?.increment);
    return {
        base:
            Number.isFinite(base) && base > 0
                ? Math.min(base, MAX_BASE)
                : DEFAULT_TIME_CONTROL.base,
        increment:
            Number.isFinite(increment) && increment >= 0
                ? Math.min(increment, MAX_INCREMENT)
                : DEFAULT_TIME_CONTROL.increment,
    };
}

// ---------------------------------------------------------------------------
// Clocks (server-authoritative, timestamp-based)
// ---------------------------------------------------------------------------

// Live time remaining for each player right now, accounting for time elapsed
// on the clock of whoever is currently on move.
export function liveTimes(
    game: Game,
    turn: Color
): { player1Time: number; player2Time: number } {
    let { player1Time, player2Time } = game;
    if (game.status === "active" && game.turnStartedAt != null) {
        const elapsed = Date.now() - game.turnStartedAt;
        if (turn === "white") {
            player1Time = Math.max(0, player1Time - elapsed);
        } else {
            player2Time = Math.max(0, player2Time - elapsed);
        }
    }
    return { player1Time, player2Time };
}

// Settle the mover's clock at move time: deduct elapsed, add increment, and
// stamp the new turn start. Mutates the game in place.
export function settleClockOnMove(game: Game, mover: Color, now: number): void {
    const elapsed = game.turnStartedAt ? now - game.turnStartedAt : 0;
    if (mover === "white") {
        game.player1Time =
            Math.max(0, game.player1Time - elapsed) + game.timeControl.increment;
    } else {
        game.player2Time =
            Math.max(0, game.player2Time - elapsed) + game.timeControl.increment;
    }
    game.turnStartedAt = now;
}

// ---------------------------------------------------------------------------
// Seats & history
// ---------------------------------------------------------------------------

export function seatColor(game: Game, playerId?: string): Color | null {
    if (playerId && playerId === game.player1Id) return "white";
    if (playerId && playerId === game.player2Id) return "black";
    return null;
}

// Redact the destination of a still-hidden half-blind move (the latest move,
// when it was half-blind and no reply has followed) so it never leaves the
// server. The opponent still learns which piece moved.
export function toMoveViews(history: MoveRecord[] = []): MoveView[] {
    const lastIdx = history.length - 1;
    return history.map((m, i) => {
        const hidden = i === lastIdx && m.halfBlind;
        return {
            san: hidden ? null : m.san,
            piece: m.piece,
            color: m.color,
            halfBlind: m.halfBlind,
            hidden,
        };
    });
}

// ---------------------------------------------------------------------------
// Rate limiting (token bucket; refill in tokens/second, up to a burst)
// ---------------------------------------------------------------------------

export type Bucket = { tokens: number; last: number; strikes: number };

export function take(bucket: Bucket, rate: number, burst: number): boolean {
    const now = Date.now();
    bucket.tokens = Math.min(
        burst,
        bucket.tokens + ((now - bucket.last) / 1000) * rate
    );
    bucket.last = now;
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
}
