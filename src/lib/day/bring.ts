import type { PersonProfile } from "@/lib/types";
import { getWeekdayKey } from "@/lib/format";
import {
  applySubjectBringRules,
  dedupeBringItems,
} from "@/lib/morning/bring-rules";
import { resolveWorkDayForDate } from "@/lib/work/schedule";

/**
 * Bring list for a person/day:
 * defaults ∪ explicit lesson/work items ∪ subject rules.
 * Deduped — no AI.
 */
export function buildBringItems(
  person: PersonProfile,
  date: Date = new Date(),
): string[] {
  const key = getWeekdayKey(date);
  const collected: string[] = [...person.defaultBringItems];
  const titles: string[] = [];
  let hasSchoolDay = false;
  const schedule = person.schedule;

  if (schedule.type === "school") {
    const lessons = schedule.week[key]?.lessons ?? [];
    hasSchoolDay = lessons.length > 0;
    for (const lesson of lessons) {
      titles.push(lesson.subject);
      lesson.bringItems?.forEach((i) => collected.push(i));
    }
  } else if (schedule.type === "work") {
    const day = resolveWorkDayForDate(schedule, date)?.day;
    if (day) {
      titles.push(day.label);
      day.bringItems?.forEach((i) => collected.push(i));
    }
  } else {
    const blocks = schedule.week[key]?.blocks ?? [];
    for (const block of blocks) {
      titles.push(block.title);
      block.bringItems?.forEach((i) => collected.push(i));
    }
  }

  collected.push(...applySubjectBringRules(titles, hasSchoolDay));
  return dedupeBringItems(collected);
}

export const EMPTY_BRING_MESSAGE = "Heute nichts Besonderes mitnehmen";
