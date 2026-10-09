/**
 * The single answer to "which lessons does this person have on this real date?".
 *
 * Priority: a real WebUntis day (`schedule.dated[iso]`) beats the manual weekday pattern
 * (`schedule.week`). A date WebUntis does not cover falls back to the manual pattern — never
 * to a guess. `buildUntisOverlay` creates the dated days from a downloaded snapshot.
 */
import type { PersonProfile, Schedule, SchoolDay, SchoolLesson, WeekdayKey } from "@/lib/types";
import { getWeekdayKey } from "@/lib/format";
import { toIsoDate } from "@/lib/day/tomorrow";
import type { UntisEvent } from "@/lib/untis/ical";
import { shiftIso } from "@/lib/untis/select";

type SchoolSchedule = Extract<Schedule, { type: "school" }>;

export type SchoolDaySource = "untis" | "week";

export function schoolDayForDate(
  schedule: SchoolSchedule,
  date: Date,
): { day: SchoolDay | undefined; source: SchoolDaySource } {
  const dated = schedule.dated?.[toIsoDate(date)];
  if (dated) return { day: dated, source: "untis" };
  const key: WeekdayKey = getWeekdayKey(date);
  return { day: schedule.week[key], source: "week" };
}

/** Lessons of that day, first start first. */
export function schoolLessonsForDate(schedule: SchoolSchedule, date: Date): SchoolLesson[] {
  return schoolDayForDate(schedule, date).day?.lessons ?? [];
}

/** Last end time of the day, when every lesson of the day knows its end. */
export function schoolDayEnd(lessons: SchoolLesson[]): string | null {
  if (lessons.length === 0 || lessons.some((l) => !l.end)) return null;
  return lessons.map((l) => l.end!).sort().at(-1) ?? null;
}

/** Real WebUntis data older than this is no longer trusted at all — the manual plan takes over again. */
export const UNTIS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type UntisSnapshot = {
  events: UntisEvent[];
  fetchedAt: number;
  /** First and last date the feed really covered (ISO). Dates outside are unknown, not "free". */
  coverage: { start: string; end: string } | null;
};

/** Coverage of a stored snapshot: explicit, else derived from its events. */
export function coverageOf(
  events: UntisEvent[],
  explicit?: { start: string; end: string } | null,
): { start: string; end: string } | null {
  if (explicit) return explicit;
  if (events.length === 0) return null;
  const dates = events.map((e) => e.date).sort();
  return { start: dates[0]!, end: dates.at(-1)! };
}

export function buildUntisOverlay(snapshot: UntisSnapshot, todayIso: string): Record<string, SchoolDay> {
  const cov = snapshot.coverage;
  if (!cov) return {};
  // Never claim knowledge about days before yesterday or beyond what the feed delivered.
  const start = cov.start > shiftIso(todayIso, -1) ? cov.start : shiftIso(todayIso, -1);
  const end = cov.end;
  const byDate = new Map<string, UntisEvent[]>();
  for (const e of snapshot.events) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  const days: Record<string, SchoolDay> = {};
  for (let iso = start, guard = 0; iso <= end && guard < 400; iso = shiftIso(iso, 1), guard++) {
    const lessons: SchoolLesson[] = (byDate.get(iso) ?? [])
      // A cancelled lesson is not school: it must not move "Schulbeginn", auto-profile or the bag.
      .filter((e) => !e.cancelled)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((e) => ({
        id: e.id,
        time: e.start,
        ...(e.end && e.end !== e.start ? { end: e.end } : {}),
        subject: e.subject,
        room: e.room,
        ...(e.info ? { info: e.info } : {}),
      }));
    days[iso] = { lessons };
  }
  return days;
}

/**
 * The person as the dashboards should see them: with real WebUntis days layered over the manual
 * plan — or unchanged when there is no usable WebUntis snapshot. Pure; never written to storage.
 */
export function withUntisSchool(
  person: PersonProfile,
  snapshot: UntisSnapshot | null,
  now: Date,
): PersonProfile {
  if (person.schedule.type !== "school" || !snapshot) return person;
  if (now.getTime() - snapshot.fetchedAt > UNTIS_MAX_AGE_MS) return person;
  const dated = buildUntisOverlay(snapshot, toIsoDate(now));
  if (Object.keys(dated).length === 0) return person;
  return {
    ...person,
    schedule: { ...person.schedule, dated, datedInfo: { fetchedAt: snapshot.fetchedAt } },
  };
}

export function withUntisForPersons(
  persons: PersonProfile[],
  snapshot: UntisSnapshot | null,
  now: Date,
): PersonProfile[] {
  if (!snapshot) return persons;
  return persons.map((p) => (p.id === "levi" ? withUntisSchool(p, snapshot, now) : p));
}
