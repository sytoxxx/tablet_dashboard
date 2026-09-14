/**
 * Work-schedule helpers for morning dashboards.
 * Does not invent shifts — only reads PersonProfile.schedule.
 */
import type { PersonProfile, WeekdayKey, WorkShift, WorkShiftDay } from "@/lib/types";
import { getWeekdayKey } from "@/lib/format";

export function getWorkShiftForDate(
  person: PersonProfile,
  date: Date,
): WorkShift | null {
  if (person.schedule.type !== "work") return null;
  const key = getWeekdayKey(date);
  const day = person.schedule.week[key];
  if (!day) return null;
  return {
    label: day.label,
    start: day.start,
    end: day.end,
    location: day.location,
    notes: day.notes,
  };
}

export function isFreeWorkDay(person: PersonProfile, date: Date): boolean {
  if (person.schedule.type !== "work") return false;
  return !person.schedule.week[getWeekdayKey(date)];
}

export function workShiftDayToView(day: WorkShiftDay): WorkShift {
  return {
    label: day.label,
    start: day.start,
    end: day.end,
    location: day.location,
    notes: day.notes,
  };
}

export function listConfiguredWorkDays(
  person: PersonProfile,
): Array<{ day: WeekdayKey; shift: WorkShiftDay }> {
  if (person.schedule.type !== "work") return [];
  return (Object.entries(person.schedule.week) as Array<[WeekdayKey, WorkShiftDay]>).map(
    ([day, shift]) => ({ day, shift }),
  );
}
