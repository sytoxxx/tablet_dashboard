/**
 * A fresh install ships an invented example timetable for Levi (seed.ts). It
 * must never be shown as if it were his real school day: lessons, rooms and
 * bring-items would all be made up. A timetable counts as "demo" only while
 * it is still EXACTLY the shipped example — as soon as a real plan is scanned
 * or even a single lesson is edited, it is treated as real data.
 */
import { leviWeek } from "@/data/seed";
import { WEEKDAY_ORDER } from "@/lib/format";
import type { PersonProfile, Schedule } from "@/lib/types";

type SchoolSchedule = Extract<Schedule, { type: "school" }>;

function signature(week: SchoolSchedule["week"]): string {
  return WEEKDAY_ORDER.map((day) =>
    (week[day]?.lessons ?? [])
      .map((l) => [l.id, l.time, l.subject, l.room, (l.bringItems ?? []).join("+")].join("|"))
      .join(";"),
  ).join("/");
}

const DEMO_SIGNATURE = signature(leviWeek() as unknown as SchoolSchedule["week"]);

export function hasAnyLesson(schedule: SchoolSchedule): boolean {
  // Real WebUntis days (even a free one) mean a real timetable exists.
  if (Object.keys(schedule.dated ?? {}).length > 0) return true;
  return WEEKDAY_ORDER.some((day) => (schedule.week[day]?.lessons ?? []).length > 0);
}

export function isDemoSchoolSchedule(schedule: Schedule): boolean {
  return schedule.type === "school" && signature(schedule.week) === DEMO_SIGNATURE;
}

/** The person as the app should treat them: the shipped example timetable counts as "no timetable". */
export function withoutDemoTimetable(person: PersonProfile): PersonProfile {
  if (!isDemoSchoolSchedule(person.schedule)) return person;
  return { ...person, schedule: { ...person.schedule, week: {} } };
}
