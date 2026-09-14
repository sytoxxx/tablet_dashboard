import { describe, expect, it } from "vitest";
import {
  formatDataAge,
  resolveRelativeDayFocus,
} from "@/lib/day/relative-day";
import { resolveFocusMoment } from "@/lib/day/tomorrow";
import { DAY_CONFIG } from "@/lib/day/config";

function at(y: number, m: number, d: number, h: number, min = 0): Date {
  return new Date(y, m, d, h, min, 0, 0);
}

describe("relative day / clock", () => {
  it("marks Heute before evening threshold", () => {
    const now = at(2026, 8, 14, 10, 0);
    const focus = resolveRelativeDayFocus(now);
    expect(focus.focusIsTomorrow).toBe(false);
    expect(focus.focusRelativeLabel).toBe("Heute");
    expect(focus.focusDate.getDate()).toBe(14);
  });

  it("marks Morgen after evening threshold", () => {
    const now = at(2026, 8, 14, DAY_CONFIG.eveningTomorrowHour, 5);
    const focus = resolveRelativeDayFocus(now);
    expect(focus.focusIsTomorrow).toBe(true);
    expect(focus.focusRelativeLabel).toBe("Morgen");
    expect(focus.focusDate.getDate()).toBe(15);
  });

  it("detects midnight rollover when app stayed open", () => {
    const prev = at(2026, 8, 14, 23, 50);
    const now = at(2026, 8, 15, 0, 5);
    const focus = resolveRelativeDayFocus(now, prev);
    expect(focus.crossedMidnight).toBe(true);
    expect(focus.focusRelativeLabel).toBe("Heute");
  });

  it("resolveFocusMoment stays aligned with relative focus", () => {
    const now = at(2026, 8, 14, 19, 0);
    const a = resolveFocusMoment(now);
    const b = resolveRelativeDayFocus(now);
    expect(a.isTomorrowFocus).toBe(b.focusIsTomorrow);
    expect(a.focusWeekdayKey).toBe(b.focusWeekdayKey);
  });

  it("formats data age for offline copy", () => {
    const now = at(2026, 8, 14, 12, 10);
    const fetched = at(2026, 8, 14, 12, 6).toISOString();
    expect(formatDataAge(fetched, now)).toBe("vor 4 Min.");
  });
});
