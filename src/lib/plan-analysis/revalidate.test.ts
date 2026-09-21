import { describe, expect, it } from "vitest";
import { revalidateWorkDraftForYear } from "@/lib/plan-analysis/revalidate";
import type { AnalyzedWorkEntry } from "@/lib/plan-analysis/types";

// 2026-09-21 is a Monday; 2027-09-21 is a Tuesday — a real weekday flip
// across the year boundary, used to prove the year correction actually
// re-derives weekday consistency instead of reusing the old year's verdict.
function work(overrides: Partial<AnalyzedWorkEntry> = {}): AnalyzedWorkEntry {
  return {
    date: "2026-09-21",
    label: "Frühschicht",
    start: "06:00",
    end: "14:00",
    location: "Station 1",
    status: "work",
    ...overrides,
  };
}

describe("revalidateWorkDraftForYear — regression: year correction must not reuse the old year's plausibility", () => {
  it("flags a weekday that matched under the old year but mismatches under the corrected year", () => {
    // Under 2026, Sept 21 IS a Monday — matched, not uncertain.
    const entry = work({ weekday: "mon", baseUncertain: false, uncertain: false });
    const { entries, uncertainties } = revalidateWorkDraftForYear([entry], 2027);
    expect(entries[0]!.date).toBe("2027-09-21");
    expect(entries[0]!.uncertain).toBe(true); // 2027-09-21 is a Tuesday, not Monday
    expect(
      uncertainties.some((u) => u.path === "entries.0.date" && u.reason.includes("Wochentag")),
    ).toBe(true);
  });

  it("clears a weekday mismatch that only existed under the old (wrong) year", () => {
    // Under 2026, Sept 21 is a Monday, so "tue" was flagged as a mismatch.
    const entry = work({ weekday: "tue", baseUncertain: false, uncertain: true });
    const { entries, uncertainties } = revalidateWorkDraftForYear([entry], 2027);
    // Under 2027, Sept 21 really is a Tuesday — the mismatch is gone.
    expect(entries[0]!.date).toBe("2027-09-21");
    expect(entries[0]!.uncertain).toBe(false);
    expect(uncertainties.some((u) => u.reason.includes("Wochentag"))).toBe(false);
  });

  it("never reuses stale weekday-derived uncertainty when baseUncertain is false", () => {
    const entry = work({ weekday: "mon", baseUncertain: false, uncertain: false });
    const { entries } = revalidateWorkDraftForYear([entry], 2026); // same year, no-op check
    expect(entries[0]!.uncertain).toBe(false);
  });

  it("preserves content-only uncertainty (unresolved code) across the year change — it never depended on the year", () => {
    const entry = work({
      status: "other",
      code: "FD",
      unresolvedCode: true,
      baseUncertain: true,
      uncertain: true,
      start: "",
      end: "",
      location: "",
    });
    const { entries, uncertainties } = revalidateWorkDraftForYear([entry], 2027);
    expect(entries[0]!.uncertain).toBe(true);
    expect(entries[0]!.unresolvedCode).toBe(true);
    expect(uncertainties.some((u) => u.reason.includes("Unbekannter Dienstcode"))).toBe(true);
  });

  it("re-derives duplicate-date plausibility fresh under the corrected year", () => {
    const a = work({ date: "2026-09-21", baseUncertain: false, uncertain: false });
    const b = work({ date: "2026-09-21", start: "13:00", end: "21:00", baseUncertain: false, uncertain: false });
    const { entries, uncertainties } = revalidateWorkDraftForYear([a, b], 2027);
    expect(entries.every((e) => e.date === "2027-09-21")).toBe(true);
    expect(entries.every((e) => e.uncertain)).toBe(true);
    expect(uncertainties.some((u) => u.reason.includes("doppelt"))).toBe(true);
  });

  it("reports the corrected year as certain — the user just confirmed it explicitly", () => {
    const entry = work({ baseUncertain: false, uncertain: false });
    const { period } = revalidateWorkDraftForYear([entry], 2027);
    expect(period).toMatchObject({ year: 2027, month: 9, yearCertain: true, monthCertain: true });
  });

  it("recomputes month/day untouched — only the year segment of the date changes", () => {
    const entry = work({ date: "2026-12-24", weekday: undefined });
    const { entries } = revalidateWorkDraftForYear([entry], 2027);
    expect(entries[0]!.date).toBe("2027-12-24");
  });
});
