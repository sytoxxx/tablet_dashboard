import { describe, expect, it } from "vitest";
import { checkPlausibility } from "@/lib/plan-analysis/plausibility";
import type { AnalyzedWorkEntry, PlanPeriod } from "@/lib/plan-analysis/types";

function work(date: string, overrides: Partial<AnalyzedWorkEntry> = {}): AnalyzedWorkEntry {
  return {
    date,
    label: "Schicht",
    start: "06:00",
    end: "14:00",
    location: "X",
    status: "work",
    ...overrides,
  };
}

const CERTAIN_SEPT: PlanPeriod = { month: 9, year: 2026, monthCertain: true, yearCertain: true };

describe("checkPlausibility", () => {
  it("flags duplicate dates on both rows", () => {
    const { entries, uncertainties } = checkPlausibility(
      [work("2026-09-21"), work("2026-09-21", { start: "13:00", end: "21:00" })],
      null,
    );
    expect(entries.every((e) => e.uncertain)).toBe(true);
    expect(uncertainties.some((u) => u.reason.includes("doppelt"))).toBe(true);
  });

  it("does not flag distinct dates", () => {
    const { entries, uncertainties } = checkPlausibility(
      [work("2026-09-21"), work("2026-09-22")],
      null,
    );
    expect(entries.every((e) => !e.uncertain)).toBe(true);
    expect(uncertainties).toHaveLength(0);
  });

  it("flags a shift shorter than 1 hour as implausible", () => {
    const { entries, uncertainties } = checkPlausibility(
      [work("2026-09-21", { start: "06:00", end: "06:30" })],
      null,
    );
    expect(entries[0]!.uncertain).toBe(true);
    expect(uncertainties.some((u) => u.reason.includes("kurze Schicht"))).toBe(true);
  });

  it("flags a shift longer than 16 hours as implausible", () => {
    const { entries, uncertainties } = checkPlausibility(
      [work("2026-09-21", { start: "06:00", end: "23:00" })],
      null,
    );
    expect(entries[0]!.uncertain).toBe(true);
    expect(uncertainties.some((u) => u.reason.includes("lange Schicht"))).toBe(true);
  });

  it("treats end-before-start as an overnight shift, not an error", () => {
    const { entries } = checkPlausibility(
      [work("2026-09-21", { start: "22:00", end: "06:00" })], // 8h overnight
      null,
    );
    expect(entries[0]!.uncertain).toBeFalsy();
  });

  it("never touches a non-work (free/vacation/sick) day's plausibility", () => {
    const { entries, uncertainties } = checkPlausibility(
      [work("2026-09-21", { status: "free", start: "", end: "" })],
      null,
    );
    expect(entries[0]!.uncertain).toBeFalsy();
    expect(uncertainties).toHaveLength(0);
  });

  it("flags a date outside a confidently-recognized month/year", () => {
    const { entries, uncertainties } = checkPlausibility(
      [work("2026-10-01")], // period says September 2026
      CERTAIN_SEPT,
    );
    expect(entries[0]!.uncertain).toBe(true);
    expect(uncertainties.some((u) => u.reason.includes("außerhalb des erkannten Zeitraums"))).toBe(
      true,
    );
  });

  it("does not flag an out-of-month date when the period itself is uncertain", () => {
    const uncertainPeriod: PlanPeriod = { month: 9, year: 2026, monthCertain: true, yearCertain: false };
    const { entries } = checkPlausibility([work("2026-10-01")], uncertainPeriod);
    expect(entries[0]!.uncertain).toBeFalsy();
  });
});
