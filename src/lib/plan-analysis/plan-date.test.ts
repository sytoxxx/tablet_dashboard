import { describe, expect, it } from "vitest";
import { isIsoDate, resolvePlanDate, weekdayMatches } from "@/lib/plan-analysis/plan-date";

describe("resolvePlanDate", () => {
  it("uses the explicit year when given", () => {
    expect(resolvePlanDate({ day: 21, month: 9, year: 2026 }, new Date(2026, 8, 1))).toBe(
      "2026-09-21",
    );
  });

  it("infers the year closest to the reference date when omitted", () => {
    // Reference: mid-September 2026, plan shows day 21 / month 9 → same year.
    expect(resolvePlanDate({ day: 21, month: 9 }, new Date(2026, 8, 10))).toBe("2026-09-21");
  });

  it("rolls forward to next year across a year boundary", () => {
    // Reference: late December 2026, plan shows day 5 / month 1 (January) → 2027.
    expect(resolvePlanDate({ day: 5, month: 1 }, new Date(2026, 11, 28))).toBe("2027-01-05");
  });

  it("rolls backward when the plan is for a month that just ended", () => {
    // Reference: early January 2027, plan shows day 28 / month 12 (December) → 2026.
    expect(resolvePlanDate({ day: 28, month: 12 }, new Date(2027, 0, 3))).toBe("2026-12-28");
  });

  it("rejects a day/month that isn't a real calendar date instead of rolling over", () => {
    expect(resolvePlanDate({ day: 31, month: 4, year: 2026 }, new Date(2026, 3, 1))).toBeNull();
  });

  it("rejects out-of-range day/month", () => {
    expect(resolvePlanDate({ day: 32, month: 1 }, new Date())).toBeNull();
    expect(resolvePlanDate({ day: 1, month: 13 }, new Date())).toBeNull();
  });
});

describe("weekdayMatches / isIsoDate", () => {
  it("confirms a correct weekday for a known date", () => {
    expect(weekdayMatches("2026-09-21", "mon")).toBe(true);
    expect(weekdayMatches("2026-09-21", "tue")).toBe(false);
  });

  it("validates ISO date strings only", () => {
    expect(isIsoDate("2026-09-21")).toBe(true);
    expect(isIsoDate("21.09.2026")).toBe(false);
    expect(isIsoDate(123)).toBe(false);
  });
});
