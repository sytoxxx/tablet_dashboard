import { describe, expect, it } from "vitest";
import { seedPersons } from "@/data/seed";
import { buildDayIntelligence } from "@/lib/day/intelligence";
import { resolveAutoProfile } from "@/lib/profile/auto-select";
import { isDemoSchoolSchedule, withoutDemoTimetable } from "@/lib/school/demo-timetable";
import type { PersonProfile } from "@/lib/types";

const levi = seedPersons.find((p) => p.id === "levi")!;

/** A REAL timetable as a user would enter or scan it (different ids/content than the shipped example). */
const realLevi = (): PersonProfile => ({
  ...structuredClone(levi),
  schedule: {
    type: "school",
    week: {
      tue: {
        lessons: [
          { id: "r1", time: "07:55", subject: "Elektrotechnik", room: "E12" },
          { id: "r2", time: "09:45", subject: "Deutsch", room: "A1" },
        ],
      },
      wed: { lessons: [{ id: "r3", time: "08:50", subject: "Werkstatt", room: "WS2" }] },
    },
  },
});

// Tue 6 Oct 2026 (local), Fri 9 Oct, Sat 10 Oct
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m, 0);

describe("shipped example timetable is never shown as real", () => {
  it("is recognised while still exactly the shipped example", () => {
    expect(isDemoSchoolSchedule(levi.schedule)).toBe(true);
    const cleaned = withoutDemoTimetable(levi);
    expect(cleaned.schedule).toEqual({ type: "school", week: {} });
    expect(buildDayIntelligence(cleaned, at(6, 10, 20)).timetableMissing).toBe(true);
  });

  it("stops being 'demo' the moment a real plan exists — or even one lesson is edited", () => {
    expect(isDemoSchoolSchedule(realLevi().schedule)).toBe(false);
    const edited = structuredClone(levi);
    if (edited.schedule.type !== "school") throw new Error();
    edited.schedule.week.mon!.lessons[0]!.room = "B999";
    expect(isDemoSchoolSchedule(edited.schedule)).toBe(false);
    expect(withoutDemoTimetable(edited)).toBe(edited);
  });

  it("does not touch work profiles", () => {
    const birgit = seedPersons.find((p) => p.id === "birgit")!;
    expect(withoutDemoTimetable(birgit)).toBe(birgit);
  });

  it("the example does not auto-open Levi on a school morning", () => {
    const idle = (id: "birgit" | "heidi"): PersonProfile => ({
      ...structuredClone(seedPersons.find((p) => p.id === id)!),
      schedule: { type: "work", week: {}, entries: [] },
    });
    const others = [idle("birgit"), idle("heidi")];
    // Tue 08:00: with the shipped example Levi must NOT be picked (no real school known); a real timetable does.
    expect(resolveAutoProfile([levi, ...others], at(6, 8))).toBe("heidi");
    expect(resolveAutoProfile([realLevi(), ...others], at(6, 8))).toBe("levi");
  });
});

describe("real timetable: today / tomorrow / free / missing", () => {
  const p = realLevi();

  it("today: shows exactly the entered lessons of this weekday, nothing added", () => {
    const view = buildDayIntelligence(p, at(6, 7, 0));
    expect(view.focusIsTomorrow).toBe(false);
    expect(view.timetable).toEqual([
      { time: "07:55", subject: "Elektrotechnik", room: "E12" },
      { time: "09:45", subject: "Deutsch", room: "A1" },
    ]);
    expect(view.timetableMissing).toBe(false);
    expect(view.dayFlow).toMatchObject({ status: "next", block: { title: "Elektrotechnik" } });
  });

  it("during a lesson: that lesson is 'läuft gerade'; after the last: done", () => {
    expect(buildDayIntelligence(p, at(6, 8, 10)).dayFlow).toMatchObject({ status: "current", block: { title: "Elektrotechnik" } });
    expect(buildDayIntelligence(p, at(6, 12, 0)).dayFlow.status).toBe("done");
  });

  it("evening: the Morgen view shows TOMORROW's lessons (Wednesday)", () => {
    const view = buildDayIntelligence(p, at(6, 20, 30));
    expect(view.focusIsTomorrow).toBe(true);
    expect(view.timetable).toEqual([{ time: "08:50", subject: "Werkstatt", room: "WS2" }]);
    expect(view.dayFlow).toMatchObject({ status: "next", block: { title: "Werkstatt" } });
  });

  it("a weekday without entered lessons says so — it does not invent any", () => {
    const view = buildDayIntelligence(p, at(8, 9, 0)); // Thursday: nothing entered
    expect(view.timetable).toEqual([]);
    expect(view.dayFlow.status).toBe("free");
    expect(view.timetableMissing).toBe(false); // other days exist -> plan exists, this day is simply empty
  });

  it("Friday evening looks at the weekend: no lessons", () => {
    const view = buildDayIntelligence(p, at(9, 20, 30));
    expect(view.focusIsTomorrow).toBe(true);
    expect(view.timetable).toEqual([]);
  });

  it("Saturday morning: no lessons", () => {
    expect(buildDayIntelligence(p, at(10, 8, 0)).timetable).toEqual([]);
  });
});

describe("evening prep never shows a made-up end of the school day", () => {
  it("shows only the first lesson's start ('ab 07:55'), not the last lesson's start as an end time", async () => {
    const { buildEveningPrep } = await import("@/lib/evening/prep");
    const prep = buildEveningPrep({ person: realLevi(), now: at(6, 20, 30) });
    expect(prep.dayContext.timeRange).toBe("ab 08:50"); // tomorrow = Wednesday, one lesson at 08:50
  });
});
