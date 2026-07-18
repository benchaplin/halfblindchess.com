import { describe, it, expect } from "vitest";
import { formatClock } from "../../src/utils/format";

describe("formatClock", () => {
    it("shows mm:ss at or above 10 seconds", () => {
        expect(formatClock(300_000)).toBe("5:00");
        expect(formatClock(65_000)).toBe("1:05");
        expect(formatClock(600_000)).toBe("10:00");
        expect(formatClock(10_000)).toBe("0:10");
    });
    it("shows seconds.tenths under 10 seconds", () => {
        expect(formatClock(9_500)).toBe("9.5");
        expect(formatClock(1_200)).toBe("1.2");
        expect(formatClock(400)).toBe("0.4");
    });
    it("never renders negative time", () => {
        expect(formatClock(-1)).toBe("0.0");
        expect(formatClock(0)).toBe("0.0");
    });
    it("ceils seconds so a fresh clock reads its full value", () => {
        // 4:59.999 should display as 5:00, not 4:59
        expect(formatClock(299_999)).toBe("5:00");
    });
});
