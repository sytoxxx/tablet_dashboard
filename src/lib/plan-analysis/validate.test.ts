import { describe, expect, it } from "vitest";
import { validatePlanAnalysis } from "@/lib/plan-analysis/validate";
import type { WorkPlanDraft } from "@/lib/plan-analysis/types";

const REF = new Date(2026, 8, 10); // 2026-09-10, mid-September

function workPayload(entries: unknown[]) {
  return {
    mode: "work",
    source: "ai",
    confidence: 0.9,
    warnings: [],
    uncertainties: [],
    draft: { type: "work", entries },
  };
}

function entriesOf(result: ReturnType<typeof validatePlanAnalysis>) {
  if (!result.ok) throw new Error("expected ok result");
  const draft = result.result.draft as WorkPlanDraft;
  if (draft.type !== "work") throw new Error("expected work draft");
  return draft.entries;
}

describe("validatePlanAnalysis — dated work entries", () => {
  it("maps day/month/year to real ISO dates and keeps status distinctions", () => {
    const result = validatePlanAnalysis(
      workPayload([
        { day: 21, month: 9, year: 2026, weekday: "mon", label: "Frühschicht", start: "06:00", end: "14:00", location: "X", status: "work" },
        { day: 22, month: 9, year: 2026, weekday: "tue", label: "Frei", status: "free" },
        { day: 23, month: 9, year: 2026, weekday: "wed", label: "Schicht", start: "12:00", end: "20:00", location: "Y", status: "work" },
        { day: 24, month: 9, year: 2026, weekday: "thu", label: "Urlaub", status: "vacation" },
        { day: 25, month: 9, year: 2026, weekday: "fri", label: "Krankenstand", status: "sick" },
      ]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    const entries = entriesOf(result);
    expect(entries).toHaveLength(5);
    expect(entries.find((e) => e.date === "2026-09-21")).toMatchObject({
      status: "work",
      start: "06:00",
      end: "14:00",
    });
    expect(entries.find((e) => e.date === "2026-09-22")).toMatchObject({ status: "free" });
    expect(entries.find((e) => e.date === "2026-09-24")).toMatchObject({
      status: "vacation",
      label: "Urlaub",
    });
    expect(entries.find((e) => e.date === "2026-09-25")).toMatchObject({
      status: "sick",
      label: "Krankenstand",
    });
    // Sorted chronologically regardless of input order.
    expect(entries.map((e) => e.date)).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
    ]);
  });

  it("accepts an already-ISO date directly (e.g. from the mock provider)", () => {
    const result = validatePlanAnalysis(
      workPayload([{ date: "2026-09-21", label: "Frei", status: "free" }]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    expect(entriesOf(result)[0]).toMatchObject({ date: "2026-09-21", status: "free" });
  });

  it("infers the year when the plan omits it", () => {
    const result = validatePlanAnalysis(
      workPayload([
        { day: 21, month: 9, label: "Frühschicht", start: "06:00", end: "14:00", location: "X", status: "work" },
      ]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    expect(entriesOf(result)[0]?.date).toBe("2026-09-21");
  });

  it("rolls the inferred year across a year boundary", () => {
    const dec = new Date(2026, 11, 28);
    const result = validatePlanAnalysis(
      workPayload([{ day: 5, month: 1, label: "Frühschicht", start: "06:00", end: "14:00", location: "X", status: "work" }]),
      "work",
      dec,
    );
    expect(result.ok).toBe(true);
    expect(entriesOf(result)[0]?.date).toBe("2027-01-05");
  });

  it("infers free from a legacy 'Frei' label when status is omitted", () => {
    const result = validatePlanAnalysis(
      workPayload([{ day: 22, month: 9, year: 2026, label: "FREI" }]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    expect(entriesOf(result)[0]).toMatchObject({ status: "free" });
  });

  it("flags a row whose printed weekday doesn't match its date as uncertain", () => {
    const result = validatePlanAnalysis(
      workPayload([
        // 2026-09-21 is a Monday, not a Wednesday.
        { day: 21, month: 9, year: 2026, weekday: "wed", label: "Frühschicht", start: "06:00", end: "14:00", location: "X", status: "work" },
      ]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(entriesOf(result)[0]?.uncertain).toBe(true);
    expect(result.result.uncertainties.some((u) => u.reason.includes("Wochentag"))).toBe(true);
  });

  it("drops a row with an invalid day/month instead of guessing", () => {
    const result = validatePlanAnalysis(
      workPayload([
        { day: 31, month: 4, year: 2026, label: "Frühschicht", start: "06:00", end: "14:00", location: "X", status: "work" },
        { day: 21, month: 9, year: 2026, label: "Frühschicht", start: "06:00", end: "14:00", location: "X", status: "work" },
      ]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    expect(entriesOf(result)).toHaveLength(1);
  });

  it("keeps a work day with missing/unreadable times instead of silently dropping it — never invents a shift", () => {
    const result = validatePlanAnalysis(
      workPayload([
        { day: 21, month: 9, year: 2026, label: "Frühschicht", start: "08:00", location: "X" }, // no end
      ]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    const entries = entriesOf(result);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      date: "2026-09-21",
      start: "",
      end: "",
      timeUnclear: true,
      uncertain: true,
    });
    if (!result.ok) return;
    expect(
      result.result.uncertainties.some((u) => u.reason.includes("Zeit nicht eindeutig erkannt")),
    ).toBe(true);
  });

  it("splits a combined range token when only one time field was given", () => {
    const result = validatePlanAnalysis(
      workPayload([
        { day: 21, month: 9, year: 2026, label: "Frühschicht", start: "06:00-14:00", location: "X" },
      ]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    expect(entriesOf(result)[0]).toMatchObject({ start: "06:00", end: "14:00" });
    expect(entriesOf(result)[0]?.timeUnclear).toBeFalsy();
  });

  it("accepts common alternate time formats (dot separator, no separator, single digit hour)", () => {
    const result = validatePlanAnalysis(
      workPayload([
        { day: 21, month: 9, year: 2026, label: "A", start: "06.00", end: "14.00", location: "X" },
        { day: 22, month: 9, year: 2026, label: "B", start: "0600", end: "1400", location: "X" },
        { day: 23, month: 9, year: 2026, label: "C", start: "6:00", end: "14:00", location: "X" },
      ]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    const entries = entriesOf(result);
    expect(entries.every((e) => e.start === "06:00" && e.end === "14:00")).toBe(true);
  });

  it("flags a bare-hour range like '6-14' as low-confidence instead of trusting it blindly", () => {
    const result = validatePlanAnalysis(
      workPayload([{ day: 21, month: 9, year: 2026, label: "A", start: "6-14", location: "X" }]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    const entry = entriesOf(result)[0]!;
    expect(entry).toMatchObject({ start: "06:00", end: "14:00", uncertain: true });
  });

  it("still rejects a payload with no valid entries at all", () => {
    const result = validatePlanAnalysis(workPayload([]), "work", REF);
    expect(result.ok).toBe(false);
  });

  it("rejects a row with no resolvable date at all", () => {
    const result = validatePlanAnalysis(
      workPayload([{ label: "Frühschicht", start: "06:00", end: "14:00", location: "X", status: "work" }]),
      "work",
      REF,
    );
    expect(result.ok).toBe(false);
  });
});

describe("validatePlanAnalysis — period (month/year) recognition", () => {
  it("marks the year certain when every row carried an explicit year and shares one month", () => {
    const result = validatePlanAnalysis(
      workPayload([
        { day: 21, month: 9, year: 2026, label: "A", start: "06:00", end: "14:00", location: "X" },
        { day: 22, month: 9, year: 2026, label: "B", status: "free" },
      ]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.period).toEqual({ month: 9, year: 2026, monthCertain: true, yearCertain: true });
  });

  it("marks the year uncertain when it had to be inferred — never silently trusted", () => {
    const result = validatePlanAnalysis(
      workPayload([
        { day: 21, month: 9, label: "A", start: "06:00", end: "14:00", location: "X" }, // no year
      ]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.period?.yearCertain).toBe(false);
    expect(result.result.period?.year).toBe(2026); // still surfaced as the best guess, just flagged
  });

  it("leaves month/year null when the plan spans more than one month", () => {
    const result = validatePlanAnalysis(
      workPayload([
        { day: 30, month: 9, year: 2026, label: "A", start: "06:00", end: "14:00", location: "X" },
        { day: 1, month: 10, year: 2026, label: "B", start: "06:00", end: "14:00", location: "X" },
      ]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.period?.month).toBeNull();
  });
});

describe("validatePlanAnalysis — shift-code legend", () => {
  it("resolves a known code from the document's own legend instead of guessing meaning", () => {
    const result = validatePlanAnalysis(
      {
        mode: "work",
        source: "ai",
        confidence: 0.8,
        warnings: [],
        uncertainties: [],
        legend: { F: "Frei", FD: "Frühdienst" },
        draft: { type: "work", entries: [{ day: 21, month: 9, year: 2026, code: "F" }] },
      },
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.draft.type).toBe("work");
    if (result.result.draft.type !== "work") return;
    expect(result.result.draft.entries[0]).toMatchObject({ status: "free", label: "Frei", code: "F" });
    expect(result.result.legend).toEqual({ F: "Frei", FD: "Frühdienst" });
  });

  it("flags a code with no legend match as unresolved instead of assuming 'Arbeit'", () => {
    const result = validatePlanAnalysis(
      workPayload([{ day: 21, month: 9, year: 2026, label: "FD" }]),
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entries = entriesOf(result);
    expect(entries[0]).toMatchObject({ status: "other", unresolvedCode: true, code: "FD", uncertain: true });
    expect(result.result.unknownCodes).toEqual(["FD"]);
  });

  it("a work-type code resolved via legend but with no times stays uncertain, never invents a shift", () => {
    const result = validatePlanAnalysis(
      {
        mode: "work",
        source: "ai",
        confidence: 0.8,
        warnings: [],
        uncertainties: [],
        legend: { FD: "Frühdienst" },
        draft: { type: "work", entries: [{ day: 21, month: 9, year: 2026, code: "FD" }] },
      },
      "work",
      REF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entries = entriesOf(result);
    expect(entries[0]).toMatchObject({ label: "Frühdienst", start: "", end: "", uncertain: true });
  });
});
