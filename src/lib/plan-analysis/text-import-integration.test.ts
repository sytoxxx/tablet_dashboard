/**
 * "ChatGPT-Liste einfügen → Vorschau → Korrektur → Speichern → Dashboard → Busverbindung".
 * Runs the real parser, the real save function (`applyPlanDraft`, the same one the photo import
 * uses) and the real downstream logic. Only the bus departures are fixtures (marked [TEST]).
 */
import { describe, expect, it } from "vitest";
import { seedAppData } from "@/data/seed";
import type { PersonProfile } from "@/lib/types";
import type { LiveDeparture } from "@/lib/bus/select";
import { applyPlanDraft } from "@/lib/plan-analysis/apply";
import { buildAnalysisFromText, parseWorkPlanText, type KnownPerson } from "@/lib/plan-analysis/text-import";
import { compareWorkEntries, detectWorkEntryConflicts } from "@/lib/data/conflicts";
import { buildWorkWeekGlance, getWorkShiftForDate, isFreeWorkDay } from "@/lib/work/schedule";
import { resolveWorkTimeForDate } from "@/lib/work/work-time-resolution";
import { resolveAutoProfile } from "@/lib/profile/auto-select";
import { planWorkTravel } from "@/lib/work/travel-planner";
import { buildDayIntelligence } from "@/lib/day/intelligence";
import { buildEveningPrep } from "@/lib/evening/prep";
import { validateAppDataImport } from "@/lib/data/validate-app-data";

const PERSONS: KnownPerson[] = seedAppData.persons.map((p) => ({ id: p.id, name: p.name }));

const LIST = `Person: Heidi
Monat: Oktober 2026

01.10.2026 | 06:00-12:00 | Arbeit
02.10.2026 | Frei
03.10.2026 | 06:00-12:00 | Arbeit
04.10.2026 | Urlaub
05.10.2026 | 07:00-14:00 | Arbeit
06.10.2026 | Krankenstand
07.10.2026 | 22:00-06:00 | Nachtdienst`;

const person = (id: "birgit" | "heidi"): PersonProfile =>
  structuredClone(seedAppData.persons.find((p) => p.id === id)!);

function save(base: PersonProfile, text: string, resolutions: Record<string, "keep" | "take"> = {}) {
  const outcome = parseWorkPlanText(text, { persons: PERSONS });
  expect(outcome.issues).toEqual([]);
  const result = buildAnalysisFromText(outcome);
  if (result.draft.type !== "work") throw new Error("work draft expected");
  const existing = base.schedule.type === "work" ? (base.schedule.entries ?? []) : [];
  const { changed } = compareWorkEntries(existing, result.draft.entries);
  const conflicts = detectWorkEntryConflicts(existing, changed);
  return applyPlanDraft(base, result.draft, "merge", { conflicts, resolutions });
}

const day = (d: number, h = 12, m = 0) => new Date(2026, 9, d, h, m, 0, 0);

describe("text import → save → everywhere", () => {
  const heidi = save(person("heidi"), LIST);

  it("is saved in the one existing place: schedule.entries", () => {
    expect(heidi.schedule.type).toBe("work");
    const entries = heidi.schedule.type === "work" ? (heidi.schedule.entries ?? []) : [];
    expect(entries.map((e) => `${e.date} ${e.status} ${e.start}-${e.end}`)).toEqual([
      "2026-10-01 work 06:00-12:00",
      "2026-10-02 free -",
      "2026-10-03 work 06:00-12:00",
      "2026-10-04 vacation -",
      "2026-10-05 work 07:00-14:00",
      "2026-10-06 sick -",
      "2026-10-07 work 22:00-06:00",
    ]);
    // no analysis-only field leaks into stored data
    for (const e of entries) {
      expect(Object.keys(e).sort()).not.toContain("uncertain");
      expect(Object.keys(e).sort()).not.toContain("reviewed");
    }
  });

  it("survives the data validation that runs when the app reloads from storage", () => {
    const persons = seedAppData.persons.map((p) => (p.id === "heidi" ? heidi : p));
    const roundTripped = JSON.parse(JSON.stringify({ ...seedAppData, persons }));
    const validated = validateAppDataImport(roundTripped);
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      const h = validated.data.persons.find((p) => p.id === "heidi")!;
      expect(h.schedule.type === "work" && h.schedule.entries?.length).toBe(7);
    }
  });

  it("Arbeitszeiten / freie Tage: the shared resolvers answer from the saved entries", () => {
    expect(getWorkShiftForDate(heidi, day(1))).toMatchObject({ start: "06:00", end: "12:00" });
    expect(getWorkShiftForDate(heidi, day(2))).toBeNull();
    expect(isFreeWorkDay(heidi, day(2))).toBe(true);
    expect(isFreeWorkDay(heidi, day(4))).toBe(true); // Urlaub
    expect(isFreeWorkDay(heidi, day(6))).toBe(true); // Krankenstand
    expect(isFreeWorkDay(heidi, day(5))).toBe(false);
    expect(resolveWorkTimeForDate(heidi, day(5))).toMatchObject({ kind: "confirmed", status: "work" });
    expect(resolveWorkTimeForDate(heidi, day(4))).toEqual({ kind: "confirmed", status: "vacation", shift: null });
  });

  it("Wochenübersicht: Mon 28.9. – Sun 4.10. shows Frei, Arbeit, Urlaub", () => {
    const week = buildWorkWeekGlance(heidi.schedule.type === "work" ? heidi.schedule : null, day(1));
    const byDay = Object.fromEntries(week.map((d) => [d.day, `${d.statusLabel}${d.hours ? " " + d.hours : ""}`]));
    expect(byDay.thu).toBe("Arbeit 06:00–12:00");
    expect(byDay.fri).toBe("Frei");
    expect(byDay.sat).toBe("Arbeit 06:00–12:00");
    expect(byDay.sun).toBe("Urlaub");
    // 28.9. is not in the list: whatever the glance shows there comes from the manually configured
    // weekday pattern (existing behaviour), never from the import.
    expect(byDay.mon).not.toContain("06:00");
  });

  it("morgige Dienste: the dashboard intelligence reads tomorrow's imported shift in the evening", () => {
    const view = buildDayIntelligence(heidi, day(4, 20, 0)); // Sunday evening → focus Monday 5.10.
    expect(view.focusIsTomorrow).toBe(true);
    expect(view.workShift).toMatchObject({ start: "07:00", end: "14:00" });
  });

  it("Abendansicht: tomorrow's imported shift is shown as the day context", () => {
    const prep = buildEveningPrep({ person: heidi, now: day(4, 20, 0) });
    expect(prep.dayContext).toMatchObject({ kind: "work", timeRange: "07:00–14:00" });
  });

  it("automatische Profilauswahl: Birgit with an imported shift today wins", () => {
    const birgit = save(
      person("birgit"),
      "Person: Birgit\nMonat: Oktober 2026\n05.10.2026 | 08:00-16:00 | Arbeit",
    );
    const persons = seedAppData.persons.map((p) => (p.id === "birgit" ? birgit : p.id === "heidi" ? heidi : p));
    expect(resolveAutoProfile(persons, day(5, 8, 0))).toBe("birgit");
  });

  it("passende Busverbindung: the imported start time drives the bus choice", () => {
    const departures: LiveDeparture[] = [
      { line: "1", destination: "Arbeit [TEST]", time: "06:00", estimatedArrivalHHmm: "06:30" },
      { line: "1", destination: "Arbeit [TEST]", time: "06:15", estimatedArrivalHHmm: "06:45" },
      { line: "1", destination: "Arbeit [TEST]", time: "06:35", estimatedArrivalHHmm: "07:05" },
    ];
    const resolution = resolveWorkTimeForDate(heidi, day(5));
    expect(resolution.kind).toBe("confirmed");
    const shift = resolution.kind === "confirmed" ? resolution.shift! : null;
    const plan = planWorkTravel({
      personId: "heidi",
      workStart: shift!.start, // 07:00 from the imported list
      workEnd: shift!.end,
      transitPrefs: { leadTimeMinutes: 25, walkToStopMinutes: 8, stopToWorkMinutes: 5, preparationMinutes: 20, safetyBufferMinutes: 5 },
      departures,
      now: day(5, 5, 30),
      stopName: "Start",
      source: "local",
    });
    expect(plan.matched).toBe(true);
    // 07:00 start, 5 min walk from the stop, 5 min buffer → the 06:35 bus (arrives 07:05) is too late, 06:15 fits
    expect(plan.busDeparture).toBe("06:15");
    expect(plan.arrivalAtWork).toBe("06:50");
  });
});

describe("existing month: compare and confirm", () => {
  const first = save(person("heidi"), LIST);
  const entriesOf = (p: PersonProfile) => (p.schedule.type === "work" ? (p.schedule.entries ?? []) : []);

  it("importing the same list again changes nothing and asks nothing", () => {
    const outcome = parseWorkPlanText(LIST, { persons: PERSONS });
    const r = buildAnalysisFromText(outcome);
    if (r.draft.type !== "work") throw new Error();
    const cmp = compareWorkEntries(entriesOf(first), r.draft.entries);
    expect(cmp.changed).toEqual([]);
    expect(cmp.unchanged).toHaveLength(7);
    const again = save(first, LIST);
    expect(entriesOf(again)).toEqual(entriesOf(first));
  });

  it("a changed day must be decided — keep leaves it, take replaces it, other days are untouched", () => {
    const changedList = LIST.replace("03.10.2026 | 06:00-12:00 | Arbeit", "03.10.2026 | 08:00-16:00 | Arbeit");
    const outcome = parseWorkPlanText(changedList, { persons: PERSONS });
    const r = buildAnalysisFromText(outcome);
    if (r.draft.type !== "work") throw new Error();
    const cmp = compareWorkEntries(entriesOf(first), r.draft.entries);
    expect(cmp.changed.map((e) => e.date)).toEqual(["2026-10-03"]);
    const conflicts = detectWorkEntryConflicts(entriesOf(first), cmp.changed);
    expect(conflicts).toHaveLength(1);

    const key = (c: (typeof conflicts)[number]) => `${c.date}|${c.existingLabel}|${c.incomingLabel}`;
    const kept = save(first, changedList, { [key(conflicts[0]!)]: "keep" });
    expect(entriesOf(kept).find((e) => e.date === "2026-10-03")!.start).toBe("06:00");
    const taken = save(first, changedList, { [key(conflicts[0]!)]: "take" });
    expect(entriesOf(taken).find((e) => e.date === "2026-10-03")!.start).toBe("08:00");
    expect(entriesOf(taken)).toHaveLength(7);
  });

  it("another month never overwrites this one", () => {
    const november = save(first, "Person: Heidi\nMonat: November 2026\n02.11.2026 | 06:00-12:00 | Arbeit\n03.11.2026 | Frei");
    const all = entriesOf(november);
    expect(all).toHaveLength(9);
    expect(all.filter((e) => e.date.startsWith("2026-10"))).toEqual(entriesOf(first));
  });

  it("a partial list does not delete the days it does not mention", () => {
    const partial = save(first, "Person: Heidi\nMonat: Oktober 2026\n01.10.2026 | 06:00-12:00 | Arbeit");
    expect(entriesOf(partial)).toHaveLength(7);
  });
});
