import { describe, expect, it } from "vitest";
import { detectWorkEntryConflicts } from "@/lib/data/conflicts";
import type { WorkPlanEntry } from "@/lib/types";

function entry(date: string, overrides: Partial<WorkPlanEntry> = {}): WorkPlanEntry {
  return {
    date,
    label: "Frühschicht",
    start: "06:00",
    end: "14:00",
    location: "X",
    status: "work",
    ...overrides,
  };
}

describe("detectWorkEntryConflicts", () => {
  it("flags a real calendar date present in both existing and incoming", () => {
    const existing = [entry("2026-09-21"), entry("2026-09-23")];
    const incoming = [entry("2026-09-21", { start: "08:00", end: "16:00" })];
    const conflicts = detectWorkEntryConflicts(existing, incoming);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ date: "2026-09-21", day: "mon" });
  });

  it("does not conflict when dates differ, even on the same weekday", () => {
    // Both Mondays, one week apart — must not collide.
    const existing = [entry("2026-09-14")];
    const incoming = [entry("2026-09-21")];
    expect(detectWorkEntryConflicts(existing, incoming)).toHaveLength(0);
  });

  it("flags identical values too (still needs user confirmation on the date)", () => {
    const existing = [entry("2026-09-21")];
    const incoming = [entry("2026-09-21")];
    expect(detectWorkEntryConflicts(existing, incoming)).toHaveLength(1);
  });

  it("flags a Frei→Urlaub reclassification on the same date", () => {
    const existing = [entry("2026-09-22", { status: "free", label: "Frei", start: "", end: "", location: "" })];
    const incoming = [entry("2026-09-22", { status: "vacation", label: "Urlaub", start: "", end: "", location: "" })];
    const conflicts = detectWorkEntryConflicts(existing, incoming);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.existingLabel).toBe("Frei");
    expect(conflicts[0]?.incomingLabel).toBe("Urlaub");
  });

  it("returns nothing when there is no existing data at all", () => {
    expect(detectWorkEntryConflicts([], [entry("2026-09-21")])).toHaveLength(0);
  });
});
