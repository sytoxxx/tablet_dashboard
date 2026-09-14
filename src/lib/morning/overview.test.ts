import { describe, expect, it } from "vitest";
import { seedAppData, seedPersons } from "@/data/seed";
import { buildBringItems } from "@/lib/day/bring";
import { clothingRecommendation } from "@/lib/weather/clothing";
import { resolveBusMorning } from "@/lib/morning/bus-status";
import {
  dedupeBringItems,
  itemsFromSubjectTitle,
} from "@/lib/morning/bring-rules";
import { getMorningOverview } from "@/lib/morning/overview";
import {
  filterRelevantAppointments,
  resolveNextActivity,
} from "@/lib/morning/next-activity";
import type { PersonProfile } from "@/lib/types";
import { blocksFromTimetable, blocksFromWorkShift } from "@/lib/day/schedule-flow";
import { buildDayIntelligence } from "@/lib/day/intelligence";

function person(id: "levi" | "birgit" | "heidi"): PersonProfile {
  const p = seedPersons.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return structuredClone(p);
}

/** Monday 2026-09-14 */
const MON_MORNING = new Date(2026, 8, 14, 7, 0, 0, 0);
const MON_DURING_MATH = new Date(2026, 8, 14, 8, 30, 0, 0);
const MON_AFTER_SCHOOL = new Date(2026, 8, 14, 14, 0, 0, 0);
const MON_EVENING = new Date(2026, 8, 14, 20, 0, 0, 0);
/** Saturday — Levi has no school */
const SAT_MORNING = new Date(2026, 8, 19, 8, 0, 0, 0);

describe("bring rules", () => {
  it("maps subjects to items", () => {
    expect(itemsFromSubjectTitle("Mathematik")).toContain("Mathematik-Unterlagen");
    expect(itemsFromSubjectTitle("Sport")).toContain("Sportsachen");
    expect(itemsFromSubjectTitle("Informatik")).toContain("Laptop");
  });

  it("dedupes synonyms and case", () => {
    expect(
      dedupeBringItems(["Sportzeug", "sportsachen", "Laptop", "laptop", "Wasserflasche"]),
    ).toEqual(["Sportsachen", "Laptop", "Wasserflasche"]);
  });

  it("builds school bring list with rules + seed items without duplicates", () => {
    const levi = person("levi");
    const items = buildBringItems(levi, MON_MORNING);
    expect(items).toContain("Wasserflasche");
    expect(items).toContain("Mathematik-Unterlagen");
    expect(items).toContain("Sportsachen");
    expect(items).toContain("Laptop");
    expect(items).toContain("Schulsachen");
    expect(items.filter((i) => /sport/i.test(i))).toHaveLength(1);
    expect(items.filter((i) => /laptop/i.test(i))).toHaveLength(1);
  });

  it("empty day has only defaults", () => {
    const levi = person("levi");
    const items = buildBringItems(levi, SAT_MORNING);
    expect(items).toEqual(["Wasserflasche"]);
  });
});

describe("next activity", () => {
  it("empty day → Heute nichts geplant", () => {
    const next = resolveNextActivity({
      scheduleBlocks: [],
      appointments: [],
      now: SAT_MORNING,
    });
    expect(next.status).toBe("empty");
    expect(next.message).toBe("Heute nichts geplant");
  });

  it("no school but appointment remains → next appointment", () => {
    const next = resolveNextActivity({
      scheduleBlocks: [],
      appointments: [{ time: "18:00", title: "Abendessen zu Hause" }],
      now: SAT_MORNING,
    });
    expect(next.status).toBe("upcoming");
    expect(next.kind).toBe("appointment");
    expect(next.title).toBe("Abendessen zu Hause");
  });

  it("school day morning → next lesson", () => {
    const view = buildDayIntelligence(person("levi"), MON_MORNING);
    const next = resolveNextActivity({
      scheduleBlocks: blocksFromTimetable(view.timetable),
      appointments: view.calendar,
      now: MON_MORNING,
    });
    expect(next.status).toBe("upcoming");
    expect(next.title).toBe("Mathematik");
    expect(next.time).toBe("08:15");
    expect(next.relativeLabel).toMatch(/in \d+ Min\.|um 08:15/);
  });

  it("running lesson → läuft gerade", () => {
    const view = buildDayIntelligence(person("levi"), MON_DURING_MATH);
    const next = resolveNextActivity({
      scheduleBlocks: blocksFromTimetable(view.timetable),
      appointments: view.calendar,
      now: MON_DURING_MATH,
    });
    expect(next.status).toBe("current");
    expect(next.title).toBe("Mathematik");
    expect(next.relativeLabel).toBe("läuft gerade");
  });

  it("after school → next appointment", () => {
    const view = buildDayIntelligence(person("levi"), MON_AFTER_SCHOOL);
    const next = resolveNextActivity({
      scheduleBlocks: blocksFromTimetable(view.timetable),
      appointments: view.calendar,
      now: MON_AFTER_SCHOOL,
    });
    expect(next.status).toBe("upcoming");
    expect(next.kind).toBe("appointment");
    expect(next.title).toBe("Nachhilfe Mathe");
  });

  it("past appointments filtered from relevant list", () => {
    const events = [
      { time: "08:00", title: "Früh" },
      { time: "15:30", title: "Spät" },
    ];
    const relevant = filterRelevantAppointments(events, MON_AFTER_SCHOOL);
    expect(relevant.map((e) => e.title)).toEqual(["Spät"]);
  });

  it("work day → shift as next", () => {
    const view = buildDayIntelligence(person("birgit"), MON_MORNING);
    const next = resolveNextActivity({
      scheduleBlocks: blocksFromWorkShift(view.workShift),
      appointments: view.calendar,
      now: new Date(2026, 8, 14, 5, 0, 0, 0),
    });
    expect(next.status).toBe("upcoming");
    expect(next.title).toMatch(/Frühschicht/);
  });
});

describe("bus morning status", () => {
  it("on time", () => {
    const r = resolveBusMorning({
      enabled: true,
      bus: {
        line: "1",
        destination: "X",
        departure: "05:32",
        stopName: "Start",
        minutesUntil: 12,
        arrivesInTime: true,
        matchedToWork: true,
        source: "live",
        isRealtime: true,
      },
    });
    expect(r.status).toBe("on_time");
    expect(r.message).toMatch(/rechtzeitig/i);
    expect(r.timingSource).toBe("realtime");
  });

  it("too late", () => {
    const r = resolveBusMorning({
      enabled: true,
      bus: {
        line: "1",
        destination: "X",
        departure: "08:10",
        stopName: "Start",
        minutesUntil: 5,
        arrivesInTime: false,
        matchedToWork: false,
      },
    });
    expect(r.status).toBe("too_late");
    expect(r.message).toBe("Bus reicht nicht");
  });

  it("delayed without inventing punctuality", () => {
    const r = resolveBusMorning({
      enabled: true,
      bus: {
        line: "1",
        destination: "X",
        departure: "05:41",
        stopName: "Start",
        minutesUntil: 20,
        delayMinutes: 9,
        isRealtime: true,
        source: "live",
        arrivesInTime: null,
        matchedToWork: true,
      },
    });
    expect(r.status).toBe("delayed");
    expect(r.message).toMatch(/Verspätung/);
    // matched alone must NOT claim on_time
    expect(r.status).not.toBe("on_time");
  });

  it("cancelled", () => {
    const r = resolveBusMorning({
      enabled: true,
      bus: {
        line: "1",
        destination: "X",
        departure: "05:32",
        stopName: "Start",
        minutesUntil: 0,
        cancelled: true,
      },
    });
    expect(r.status).toBe("cancelled");
    expect(r.message).toBe("Bus fällt aus");
  });

  it("marks local source as Testdaten", () => {
    const r = resolveBusMorning({
      enabled: true,
      bus: {
        line: "1",
        destination: "X",
        departure: "05:32",
        stopName: "Start",
        minutesUntil: 12,
        arrivesInTime: true,
        source: "local",
      },
    });
    expect(r.isTestData).toBe(true);
    expect(r.timingSource).toBe("test");
    expect(r.scheduleNote).toBe("Testdaten");
  });

  it("no bus", () => {
    const r = resolveBusMorning({ enabled: true, bus: null });
    expect(r.status).toBe("none");
    expect(r.message).toBe("Kein passender Bus");
  });
});

describe("weather clothing tips", () => {
  it("rain → jacket tip", () => {
    expect(
      clothingRecommendation({ temperatureC: 12, rainMm: 1.2, weatherCode: 61 }),
    ).toMatch(/Jacke/i);
  });

  it("cold → warm jacket", () => {
    expect(clothingRecommendation({ temperatureC: 3 })).toMatch(/Warme Jacke/i);
  });

  it("hot → light clothes", () => {
    expect(clothingRecommendation({ temperatureC: 28 })).toMatch(/Leichte Kleidung/i);
  });

  it("snow → warm clothes", () => {
    expect(clothingRecommendation({ temperatureC: -2, weatherCode: 71 })).toMatch(
      /Warme Kleidung/i,
    );
  });

  it("heavy rain → rain jacket", () => {
    expect(
      clothingRecommendation({ temperatureC: 10, rainMm: 5, weatherCode: 65 }),
    ).toMatch(/Regenjacke/i);
  });
});

describe("getMorningOverview", () => {
  it("empty school Saturday without appointments for Levi", () => {
    const levi = person("levi");
    levi.appointments = [];
    const o = getMorningOverview("levi", SAT_MORNING, {
      data: seedAppData,
      person: levi,
    });
    expect(o.nextActivity.status).toBe("empty");
    expect(o.nextActivity.message).toBe("Heute nichts geplant");
    expect(o.visibility.appointments).toBe(false);
    expect(o.summary).toMatch(/Guten Morgen, Levi/i);
  });

  it("normal school Monday for Levi", () => {
    const o = getMorningOverview("levi", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(o.nextActivity.title).toBe("Mathematik");
    expect(o.itemsToTake.length).toBeGreaterThan(1);
    expect(o.itemsToTake).toContain("Mathematik-Unterlagen");
    expect(o.importantTasks.length).toBeGreaterThan(0);
    expect(o.coffee.enabled).toBe(true);
    expect(o.coffee.message).toMatch(/bereit/i);
    expect(o.priorityOrder[0]).toBe("clock");
    expect(o.summary).toMatch(/08:15/);
    expect(o.summary).toMatch(/Bus|Grad/i);
  });

  it("work day for Birgit stays simple", () => {
    const o = getMorningOverview("birgit", MON_MORNING, {
      person: person("birgit"),
      data: seedAppData,
    });
    expect(o.workShift?.label).toMatch(/Frühschicht/);
    expect(o.visibility.nextActivity).toBe(false);
    expect(o.visibility.coffee).toBe(false);
    expect(o.visibility.importantTasks).toBe(false);
    expect(o.priorityOrder).toContain("work");
    expect(o.priorityOrder).toContain("bus");
  });

  it("Heidi work day still keeps coffee off and hints", () => {
    const o = getMorningOverview("heidi", MON_MORNING, {
      person: person("heidi"),
      data: seedAppData,
    });
    expect(o.workShift?.start).toBe("09:00");
    expect(o.visibility.workShift).toBe(true);
    expect(o.priorityOrder).toContain("appointments");
    expect(o.priorityOrder).toContain("hint");
    expect(o.coffee.enabled).toBe(false);
    expect(o.importantHint).toBeTruthy();
  });

  it("buildMorningSummary accepts full overview", () => {
    const o = getMorningOverview("levi", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(o.summary).toMatch(/Guten Morgen, Levi/);
    expect(o.summary).toMatch(/Mathematik/);
  });

  it("live bus delayed overlays overview", () => {
    const o = getMorningOverview("levi", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
      live: {
        busEnabled: true,
        busMatched: true,
        busIsTestData: false,
        bus: {
          line: "1",
          destination: "X",
          departure: "07:41",
          scheduledDeparture: "07:32",
          realtimeDeparture: "07:41",
          stopName: "Start",
          minutesUntil: 20,
          delayMinutes: 9,
          isRealtime: true,
          source: "live",
          arrivesInTime: true,
          matchedToWork: true,
          isTestData: false,
        },
      },
    });
    expect(o.bus.status).toBe("delayed");
    expect(o.bus.timingSource).toBe("realtime");
    expect(o.summary).toMatch(/Verspätung/);
  });

  it("live bus cancelled overlays overview", () => {
    const o = getMorningOverview("birgit", MON_MORNING, {
      person: person("birgit"),
      data: seedAppData,
      live: {
        busEnabled: true,
        bus: {
          line: "1",
          destination: "Bruck",
          departure: "05:32",
          stopName: "Start",
          minutesUntil: 0,
          cancelled: true,
          source: "live",
        },
      },
    });
    expect(o.bus.status).toBe("cancelled");
    expect(o.summary).toMatch(/fällt aus/);
  });

  it("important tasks only", () => {
    const levi = person("levi");
    levi.tasks = [
      { id: "1", label: "Paket abholen", done: false, important: true },
      { id: "2", label: "Egal", done: false, important: false },
      { id: "3", label: "Erledigt wichtig", done: true, important: true },
    ];
    const o = getMorningOverview("levi", MON_MORNING, { person: levi, data: seedAppData });
    expect(o.importantTasks.map((t) => t.label)).toEqual(["Paket abholen"]);
  });

  it("multiple appointments sorted; past hidden", () => {
    const levi = person("levi");
    levi.appointments = [
      { id: "a", title: "Arzt", time: "10:30", date: "2026-09-14" },
      { id: "b", title: "Termin", time: "14:00", date: "2026-09-14" },
      { id: "c", title: "Früh", time: "06:00", date: "2026-09-14" },
    ];
    const o = getMorningOverview("levi", MON_MORNING, { person: levi, data: seedAppData });
    expect(o.appointments.map((a) => a.title)).toEqual(["Arzt", "Termin"]);
  });

  it("live bus too late overlays overview", () => {
    const o = getMorningOverview("levi", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
      live: {
        busEnabled: true,
        busMatched: false,
        bus: {
          line: "1",
          destination: "X",
          departure: "08:12",
          stopName: "Start",
          minutesUntil: 20,
          arrivesInTime: false,
          matchedToWork: false,
        },
      },
    });
    expect(o.bus.status).toBe("too_late");
    expect(o.bus.message).toBe("Bus reicht nicht");
  });

  it("day rollover evening → tomorrow focus", () => {
    const o = getMorningOverview("levi", MON_EVENING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(o.focusIsTomorrow).toBe(true);
    // Tuesday plan after Monday evening
    expect(o.focusIsoDate).toBe("2026-09-15");
  });

  it("different persons yield different priority stacks", () => {
    const levi = getMorningOverview("levi", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    const birgit = getMorningOverview("birgit", MON_MORNING, {
      person: person("birgit"),
      data: seedAppData,
    });
    expect(levi.priorityOrder).not.toEqual(birgit.priorityOrder);
    expect(levi.visibility.coffee).toBe(true);
    expect(birgit.visibility.coffee).toBe(false);
  });
});
