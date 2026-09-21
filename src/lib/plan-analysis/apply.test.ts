import { describe, expect, it } from "vitest";
import { applyPlanDraft, personHasScheduleContent } from "@/lib/plan-analysis/apply";
import { detectWorkEntryConflicts } from "@/lib/data/conflicts";
import { conflictKey, type ConflictResolution } from "@/lib/data/conflict-resolution";
import type { PersonProfile, WorkPlanEntry, WorkShiftDay } from "@/lib/types";
import type { WorkPlanDraft } from "@/lib/plan-analysis/types";

function person(
  week: Partial<Record<string, WorkShiftDay>>,
  entries: WorkPlanEntry[] = [],
): PersonProfile {
  return {
    id: "birgit",
    name: "Birgit",
    avatar: "B",
    hint: "Arbeit",
    greeting: "",
    accent: "#000",
    schedule: { type: "work", week: week as never, entries },
    appointments: [],
    busStop: null,
    tasks: [],
    defaultBringItems: [],
    weather: { summary: "", temperatureC: 10, clothingTip: "" } as never,
    personalSettings: {},
    displayPrefs: {} as never,
  };
}

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

function draft(entries: WorkPlanEntry[]): WorkPlanDraft {
  return { type: "work", entries: entries.map((e) => ({ ...e })) };
}

const baseline = {
  mon: { label: "Frühschicht", start: "06:00", end: "14:00", location: "Bruck" },
} satisfies Partial<Record<string, WorkShiftDay>>;

describe("applyPlanDraft — replace mode (dated entries)", () => {
  it("sets entries directly when there is nothing existing", () => {
    const p = person(baseline, []);
    const next = applyPlanDraft(p, draft([entry("2026-09-21"), entry("2026-09-22")]), "replace");
    expect(next.schedule.type).toBe("work");
    if (next.schedule.type !== "work") return;
    expect(next.schedule.entries?.map((e) => e.date)).toEqual(["2026-09-21", "2026-09-22"]);
  });

  it("only replaces the date range covered by the new upload — other months survive", () => {
    const existing = [entry("2026-08-10"), entry("2026-09-21"), entry("2026-10-05")];
    const p = person(baseline, existing);
    const incoming = draft([entry("2026-09-21", { start: "08:00" }), entry("2026-09-22")]);
    const next = applyPlanDraft(p, incoming, "replace");
    if (next.schedule.type !== "work") throw new Error("expected work schedule");
    const dates = next.schedule.entries!.map((e) => e.date);
    // August and October (outside the incoming range) must survive untouched.
    expect(dates).toContain("2026-08-10");
    expect(dates).toContain("2026-10-05");
    expect(dates).toContain("2026-09-22");
    const sept21 = next.schedule.entries!.find((e) => e.date === "2026-09-21");
    expect(sept21?.start).toBe("08:00"); // replaced, not merged
  });

  it("never touches the recurring baseline week pattern", () => {
    const p = person(baseline, [entry("2026-09-21")]);
    const next = applyPlanDraft(p, draft([entry("2026-09-28")]), "replace");
    if (next.schedule.type !== "work") throw new Error("expected work schedule");
    expect(next.schedule.week).toEqual(baseline);
  });
});

describe("applyPlanDraft — merge mode (dated entries)", () => {
  it("adds new dates without touching unrelated existing dates when there is no conflict", () => {
    const p = person(baseline, [entry("2026-09-14")]);
    const next = applyPlanDraft(p, draft([entry("2026-09-21")]), "merge");
    if (next.schedule.type !== "work") throw new Error("expected work schedule");
    expect(next.schedule.entries!.map((e) => e.date)).toEqual(["2026-09-14", "2026-09-21"]);
  });

  it("'keep' resolution leaves the existing entry for that date untouched", () => {
    const existing = [entry("2026-09-21", { label: "Alt", start: "05:00", end: "13:00" })];
    const incoming = [entry("2026-09-21", { label: "Neu", start: "08:00", end: "16:00" })];
    const conflicts = detectWorkEntryConflicts(existing, incoming);
    const resolutions: Record<string, ConflictResolution> = {
      [conflictKey(conflicts[0]!)]: "keep",
    };
    const p = person(baseline, existing);
    const next = applyPlanDraft(p, draft(incoming), "merge", { conflicts, resolutions });
    if (next.schedule.type !== "work") throw new Error("expected work schedule");
    expect(next.schedule.entries).toHaveLength(1);
    expect(next.schedule.entries![0]).toMatchObject({ label: "Alt", start: "05:00" });
  });

  it("'take' resolution replaces the existing entry for that date with the incoming one", () => {
    const existing = [entry("2026-09-21", { label: "Alt", start: "05:00", end: "13:00" })];
    const incoming = [entry("2026-09-21", { label: "Neu", start: "08:00", end: "16:00" })];
    const conflicts = detectWorkEntryConflicts(existing, incoming);
    const resolutions: Record<string, ConflictResolution> = {
      [conflictKey(conflicts[0]!)]: "take",
    };
    const p = person(baseline, existing);
    const next = applyPlanDraft(p, draft(incoming), "merge", { conflicts, resolutions });
    if (next.schedule.type !== "work") throw new Error("expected work schedule");
    expect(next.schedule.entries).toHaveLength(1);
    expect(next.schedule.entries![0]).toMatchObject({ label: "Neu", start: "08:00" });
  });

  it("default 'both' resolution keeps the incoming value and appends a note about the prior draft", () => {
    const existing = [entry("2026-09-21", { label: "Alt", start: "05:00", end: "13:00" })];
    const incoming = [entry("2026-09-21", { label: "Neu", start: "08:00", end: "16:00" })];
    const p = person(baseline, existing);
    // No explicit resolutions -> defaults to "both" for every conflict.
    const next = applyPlanDraft(p, draft(incoming), "merge");
    if (next.schedule.type !== "work") throw new Error("expected work schedule");
    expect(next.schedule.entries).toHaveLength(1);
    const result = next.schedule.entries![0]!;
    expect(result.label).toBe("Alt");
    expect(result.notes).toContain("Konflikt-Entwurf");
    expect(result.notes).toContain("Neu");
  });

  it("never touches the recurring baseline week pattern", () => {
    const p = person(baseline, [entry("2026-09-14")]);
    const next = applyPlanDraft(p, draft([entry("2026-09-21")]), "merge");
    if (next.schedule.type !== "work") throw new Error("expected work schedule");
    expect(next.schedule.week).toEqual(baseline);
  });
});

describe("personHasScheduleContent", () => {
  it("is true when only dated entries exist (no recurring week days)", () => {
    const p = person({}, [entry("2026-09-21")]);
    expect(personHasScheduleContent(p, "work")).toBe(true);
  });

  it("is true when only the recurring week pattern exists", () => {
    const p = person(baseline, []);
    expect(personHasScheduleContent(p, "work")).toBe(true);
  });

  it("is false when the work schedule is completely empty", () => {
    const p = person({}, []);
    expect(personHasScheduleContent(p, "work")).toBe(false);
  });
});
