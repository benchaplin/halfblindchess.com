import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    normalizeTimeControl,
    isValidGameId,
    sanitizeId,
    sanitizeUsername,
    isSquare,
    liveTimes,
    settleClockOnMove,
    seatColor,
    toMoveViews,
    take,
    MAX_BASE,
    MAX_INCREMENT,
    MAX_USERNAME_LEN,
    MAX_ID_LEN,
    type Bucket,
} from "../../game-server/services/logic";
import { Game, MoveRecord } from "../../types/gameTypes";

const START_FEN = "0 rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function game(partial: Partial<Game> = {}): Game {
    return {
        player1Id: "p1",
        player2Id: "p2",
        player1Time: 300_000,
        player2Time: 300_000,
        fen: START_FEN,
        history: [],
        timeControl: { base: 300_000, increment: 0 },
        turnStartedAt: null,
        status: "active",
        winner: null,
        ...partial,
    };
}

describe("normalizeTimeControl", () => {
    it("passes valid values through", () => {
        expect(normalizeTimeControl({ base: 300_000, increment: 3_000 })).toEqual({
            base: 300_000,
            increment: 3_000,
        });
    });
    it("clamps to the max base/increment", () => {
        const tc = normalizeTimeControl({ base: MAX_BASE * 10, increment: MAX_INCREMENT * 10 });
        expect(tc.base).toBe(MAX_BASE);
        expect(tc.increment).toBe(MAX_INCREMENT);
    });
    it("falls back to defaults for junk", () => {
        expect(normalizeTimeControl({ base: -5, increment: -1 })).toEqual({ base: 300_000, increment: 0 });
        expect(normalizeTimeControl(undefined)).toEqual({ base: 300_000, increment: 0 });
        expect(normalizeTimeControl({ base: "x", increment: "y" })).toEqual({ base: 300_000, increment: 0 });
    });
});

describe("input validation", () => {
    it("isValidGameId accepts alphanumerics, rejects junk", () => {
        expect(isValidGameId("ab12cd34")).toBe(true);
        expect(isValidGameId("")).toBe(false);
        expect(isValidGameId("has-dash")).toBe(false);
        expect(isValidGameId("x".repeat(33))).toBe(false);
        expect(isValidGameId(123 as unknown)).toBe(false);
        expect(isValidGameId({ evil: true } as unknown)).toBe(false);
    });
    it("sanitizeId bounds length and rejects non-strings", () => {
        expect(sanitizeId("p_abc")).toBe("p_abc");
        expect(sanitizeId("")).toBeNull();
        expect(sanitizeId("x".repeat(MAX_ID_LEN + 1))).toBeNull();
        expect(sanitizeId(42 as unknown)).toBeNull();
    });
    it("sanitizeUsername trims + clamps length", () => {
        expect(sanitizeUsername("  Alice  ")).toBe("Alice");
        expect(sanitizeUsername("A".repeat(50))).toHaveLength(MAX_USERNAME_LEN);
        expect(sanitizeUsername("   ")).toBeUndefined();
        expect(sanitizeUsername(5 as unknown)).toBeUndefined();
    });
    it("isSquare accepts board squares only", () => {
        expect(isSquare("e4")).toBe(true);
        expect(isSquare("a1")).toBe(true);
        expect(isSquare("e9")).toBe(false);
        expect(isSquare("z1")).toBe(false);
        expect(isSquare("e")).toBe(false);
        expect(isSquare("e44")).toBe(false);
        expect(isSquare(null as unknown)).toBe(false);
    });
});

describe("clocks", () => {
    const BASE = 1_000_000_000_000;
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(BASE);
    });
    afterEach(() => vi.useRealTimers());

    it("liveTimes leaves an inactive game untouched", () => {
        const g = game({ status: "waiting", turnStartedAt: null });
        expect(liveTimes(g, "white")).toEqual({ player1Time: 300_000, player2Time: 300_000 });
    });
    it("liveTimes deducts elapsed from the side to move only", () => {
        const g = game({ turnStartedAt: BASE });
        vi.setSystemTime(BASE + 5_000);
        expect(liveTimes(g, "white")).toEqual({ player1Time: 295_000, player2Time: 300_000 });
        expect(liveTimes(g, "black")).toEqual({ player1Time: 300_000, player2Time: 295_000 });
    });
    it("liveTimes never goes below zero", () => {
        const g = game({ turnStartedAt: BASE, player1Time: 2_000 });
        vi.setSystemTime(BASE + 9_999);
        expect(liveTimes(g, "white").player1Time).toBe(0);
    });
    it("settleClockOnMove deducts elapsed and adds the increment", () => {
        const g = game({ turnStartedAt: BASE, timeControl: { base: 300_000, increment: 3_000 } });
        vi.setSystemTime(BASE + 4_000);
        settleClockOnMove(g, "white", Date.now());
        expect(g.player1Time).toBe(300_000 - 4_000 + 3_000); // 299000
        expect(g.player2Time).toBe(300_000); // opponent untouched
        expect(g.turnStartedAt).toBe(BASE + 4_000);
    });
    it("settleClockOnMove clamps before adding increment", () => {
        const g = game({ turnStartedAt: BASE, player2Time: 500, timeControl: { base: 300_000, increment: 2_000 } });
        vi.setSystemTime(BASE + 5_000);
        settleClockOnMove(g, "black", Date.now());
        expect(g.player2Time).toBe(0 + 2_000);
    });
});

describe("seatColor", () => {
    it("maps ids to colors", () => {
        const g = game({ player1Id: "white-id", player2Id: "black-id" });
        expect(seatColor(g, "white-id")).toBe("white");
        expect(seatColor(g, "black-id")).toBe("black");
        expect(seatColor(g, "stranger")).toBeNull();
        expect(seatColor(g, undefined)).toBeNull();
    });
});

describe("toMoveViews (half-blind redaction)", () => {
    const mv = (san: string, piece: string, color: "w" | "b", halfBlind = false): MoveRecord => ({ san, piece, color, halfBlind });

    it("returns [] for empty history", () => {
        expect(toMoveViews([])).toEqual([]);
        expect(toMoveViews(undefined)).toEqual([]);
    });
    it("redacts a still-hidden half-blind move (latest + halfBlind)", () => {
        const views = toMoveViews([mv("e4", "p", "w"), mv("e5", "p", "b", true)]);
        expect(views[1]).toEqual({ san: null, piece: "p", color: "b", halfBlind: true, hidden: true });
        expect(JSON.stringify(views[1])).not.toContain("e5");
    });
    it("reveals a half-blind move once a reply follows", () => {
        const views = toMoveViews([mv("e4", "p", "w"), mv("e5", "p", "b", true), mv("Nf3", "n", "w")]);
        expect(views[1].hidden).toBe(false);
        expect(views[1].san).toBe("e5");
        expect(views[1].halfBlind).toBe(true); // still flagged for styling
    });
    it("does not redact a normal latest move", () => {
        const views = toMoveViews([mv("e4", "p", "w")]);
        expect(views[0].hidden).toBe(false);
        expect(views[0].san).toBe("e4");
    });
});

describe("token bucket (take)", () => {
    const BASE = 2_000_000_000_000;
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(BASE);
    });
    afterEach(() => vi.useRealTimers());

    it("allows up to the burst, then blocks", () => {
        const b: Bucket = { tokens: 3, last: BASE, strikes: 0 };
        expect(take(b, 1, 3)).toBe(true);
        expect(take(b, 1, 3)).toBe(true);
        expect(take(b, 1, 3)).toBe(true);
        expect(take(b, 1, 3)).toBe(false); // exhausted, no time passed
    });
    it("refills over time at the configured rate", () => {
        const b: Bucket = { tokens: 0, last: BASE, strikes: 0 };
        expect(take(b, 2, 10)).toBe(false); // empty
        vi.setSystemTime(BASE + 1_000); // 1s -> +2 tokens at rate 2/s
        expect(take(b, 2, 10)).toBe(true);
        expect(take(b, 2, 10)).toBe(true);
        expect(take(b, 2, 10)).toBe(false);
    });
    it("caps refill at the burst", () => {
        const b: Bucket = { tokens: 0, last: BASE, strikes: 0 };
        vi.setSystemTime(BASE + 3_600_000); // an hour later
        // only `burst` tokens available regardless of elapsed
        expect(take(b, 1, 5)).toBe(true);
        for (let i = 0; i < 4; i++) expect(take(b, 1, 5)).toBe(true);
        expect(take(b, 1, 5)).toBe(false);
    });
});
