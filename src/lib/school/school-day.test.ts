/** MOCK data (hand-made events, not a real WebUntis export) — tests that real WebUntis days win everywhere. */
import { describe, expect, it } from "vitest";
import { seedAppData } from "@/data/seed";
import type { PersonProfile } from "@/lib/types";
import type { UntisEvent } from "@/lib/untis/ical";
import { buildSuccess } from "@/lib/untis/snapshot";
import { coverageOf, schoolDayEnd, schoolDayForDate, withUntisForPersons, withUntisSchool, UNTIS_MAX_AGE_MS, type UntisSnapshot } from "@/lib/school/school-day";
import { withoutDemoTimetable } from "@/lib/school/demo-timetable";
import { buildDayIntelligence } from "@/lib/day/intelligence";
import { buildBringItems } from "@/lib/day/bring";
import { resolveAutoProfile } from "@/lib/profile/auto-select";
import { buildEveningPrep } from "@/lib/evening/prep";
import { planTravelForPerson } from "@/lib/work/travel-planner";

// Monday 12.10.2026 08:00 local
const NOW = new Date(2026, 9, 12, 6, 30);
const TODAY = "2026-10-12";
const ev = (date: string, start: string, end: string, subject: string, extra: Partial<UntisEvent> = {}): UntisEvent => ({
  id: `${date}${start}`, date, start, end, subject, room: "R1", info: "", cancelled: false, ...extra,
});

const manualLevi = (): PersonProfile => {
  const levi = structuredClone(seedAppData.persons.find((p) => p.id === "levi")!);
  // a REAL-looking manual plan (not the shipped demo): Monday starts 08:00 with Geschichte, bring item "Sportsachen"
  levi.schedule = {
    type: "school",
    week: { mon: { lessons: [{ id: "m1", time: "08:00", subject: "Geschichte", room: "A1", bringItems: ["Sportsachen"] }] }, tue: { lessons: [{ id: "t1", time: "09:00", subject: "Physik", room: "A2" }] } },
  };
  return levi;
};

function snapshot(events: UntisEvent[], over: Partial<UntisSnapshot> = {}): UntisSnapshot {
  const ok = buildSuccess(events, [], NOW.getTime(), TODAY);
  return { events: ok.events, fetchedAt: NOW.getTime(), coverage: coverageOf(ok.events, ok.coverage), ...over };
}

const EVENTS = [
  ev("2026-10-12", "07:45", "08:35", "Mathematik"),
  ev("2026-10-12", "08:35", "09:25", "Elektrotechnik", { info: "Vertretung" }),
  ev("2026-10-12", "09:25", "10:15", "Deutsch", { cancelled: true }),
  ev("2026-10-12", "10:30", "11:20", "Labor"),
  ev("2026-10-13", "08:35", "09:25", "Englisch"),
  ev("2026-10-16", "07:45", "08:35", "Freitagsstunde"),
];

describe("WebUntis days beat the manual weekday plan", () => {
  const levi = withUntisSchool(manualLevi(), snapshot(EVENTS), NOW);

  it("Heute / Morgen: the dated day replaces the Monday pattern", () => {
    const view = buildDayIntelligence(levi, NOW);
    expect(view.timetable.map((t) => t.subject)).toEqual(["Mathematik", "Elektrotechnik", "Labor"]); // Deutsch entfällt
    expect(view.timetable[0]).toMatchObject({ time: "07:45", end: "08:35" });
    const tomorrow = buildDayIntelligence(levi, new Date(2026, 9, 12, 20, 0));
    expect(tomorrow.focusIsTomorrow).toBe(true);
    expect(tomorrow.timetable.map((t) => t.subject)).toEqual(["Englisch"]);
  });

  it("Als Nächstes / Schulbeginn / Schulende come from real start and end times", () => {
    const view = buildDayIntelligence(levi, NOW);
    expect(view.dayFlow.block).toMatchObject({ start: "07:45", title: "Mathematik" });
    const during = buildDayIntelligence(levi, new Date(2026, 9, 12, 8, 50));
    expect(during.dayFlow.status).toBe("current");
    expect(during.dayFlow.block).toMatchObject({ title: "Elektrotechnik", end: "09:25" });
    const { day } = schoolDayForDate(levi.schedule as never, NOW);
    expect(schoolDayEnd(day!.lessons)).toBe("11:20");
  });

  it("a cancelled lesson never counts as school", () => {
    const all = [ev("2026-10-12", "07:45", "08:35", "Mathe", { cancelled: true })];
    const l = withUntisSchool(manualLevi(), snapshot(all, { coverage: { start: "2026-10-11", end: "2026-10-20" } }), NOW);
    expect(schoolDayForDate(l.schedule as never, NOW).day?.lessons).toEqual([]);
    expect(buildDayIntelligence(l, NOW).timetable).toEqual([]);
  });

  it("Mitnehmen: subjects of the real day, not the manual Monday (Sportsachen disappear)", () => {
    expect(buildBringItems(manualLevi(), NOW)).toContain("Sportsachen");
    const bring = buildBringItems(levi, NOW);
    expect(bring).not.toContain("Sportsachen");
  });

  it("automatische Profilauswahl: school today per WebUntis, no school today per WebUntis", () => {
    const others = seedAppData.persons
      .filter((p) => p.id !== "levi")
      .map((p) => ({ ...structuredClone(p), schedule: { type: "work" as const, week: {}, entries: [] } })); // nobody works today
    const at = new Date(2026, 9, 12, 7, 10);
    // Birgit/Heidi: no dated entries in seed → Levi is picked when he has real school
    expect(resolveAutoProfile([levi, ...others], at)).toBe("levi");
    // WebUntis says Monday is free (holiday): manual Monday plan must NOT pull Levi in
    const holiday = withUntisSchool(manualLevi(), snapshot([ev("2026-10-13", "08:00", "08:50", "X")], { coverage: { start: "2026-10-11", end: "2026-10-20" } }), NOW);
    expect(resolveAutoProfile([holiday, ...others], at)).not.toBe("levi");
    // and the manual plan alone would have chosen him
    expect(resolveAutoProfile([manualLevi(), ...others], at)).toBe("levi");
  });

  it("Abendansicht: tomorrow shows the real start–end", () => {
    const prep = buildEveningPrep({ person: levi, now: new Date(2026, 9, 12, 20, 0) });
    expect(prep.dayContext).toMatchObject({ kind: "school", timeRange: "08:35–09:25" });
  });

  it("Schulbeginn feeds the travel planner (walk plan target)", () => {
    const plan = planTravelForPerson(levi, new Date(2026, 9, 12, 6, 0));
    expect(JSON.stringify(plan)).toContain("07:45");
  });
});

describe("fallback to the manual plan", () => {
  it("a date outside the WebUntis coverage uses the manual weekday plan", () => {
    const levi = withUntisSchool(manualLevi(), snapshot(EVENTS), NOW);
    const tuesdayNextWeek = new Date(2026, 9, 20, 12, 0); // beyond coverage end (16.10.)
    const { day, source } = schoolDayForDate(levi.schedule as never, tuesdayNextWeek);
    expect(source).toBe("week");
    expect(day?.lessons[0]?.subject).toBe("Physik");
  });
  it("no snapshot → unchanged person", () => {
    const p = manualLevi();
    expect(withUntisSchool(p, null, NOW)).toBe(p);
  });
  it("a snapshot older than 7 days is not trusted any more", () => {
    const old = snapshot(EVENTS, { fetchedAt: NOW.getTime() - UNTIS_MAX_AGE_MS - 1000 });
    const p = manualLevi();
    expect(withUntisSchool(p, old, NOW)).toBe(p);
  });
  it("an empty feed gives no overlay (no fake 'free week')", () => {
    const p = manualLevi();
    expect(withUntisSchool(p, snapshot([]), NOW)).toBe(p);
  });
  it("only Levi is touched", () => {
    const persons = seedAppData.persons.map((p) => structuredClone(p));
    const out = withUntisForPersons(persons, snapshot(EVENTS), NOW);
    expect(out.find((p) => p.id === "heidi")).toBe(persons.find((p) => p.id === "heidi"));
  });
  it("the shipped demo plan stays hidden but the real WebUntis days still show", () => {
    const demo = seedAppData.persons.find((p) => p.id === "levi")!;
    const cleaned = withUntisSchool(withoutDemoTimetable(demo), snapshot(EVENTS), NOW);
    expect(buildDayIntelligence(cleaned, NOW).timetableMissing).toBe(false);
    expect(buildDayIntelligence(cleaned, NOW).timetable[0]?.subject).toBe("Mathematik");
    const next = buildDayIntelligence(withoutDemoTimetable(demo), NOW);
    expect(next.timetableMissing).toBe(true);
  });
  it("the overlay is runtime-only: the stored person object is never modified", () => {
    const p = manualLevi();
    const copy = JSON.stringify(p);
    withUntisSchool(p, snapshot(EVENTS), NOW);
    expect(JSON.stringify(p)).toBe(copy);
  });
});

describe("buildSuccess / coverage", () => {
  it("covers only what the feed delivered, inside the stored window", () => {
    const s = buildSuccess(EVENTS, [], 1, TODAY);
    expect(s.coverage).toEqual({ start: "2026-10-12", end: "2026-10-16" });
  });
  it("a feed that ended in the past has no coverage", () => {
    expect(buildSuccess([ev("2026-09-01", "08:00", "08:50", "X")], [], 1, TODAY).coverage).toBeNull();
  });
});
