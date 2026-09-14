import type { PersonProfile } from "@/lib/types";
import { getWeekdayKey } from "@/lib/format";

/** Bring list from default + today’s plan blocks (no AI). */
export function buildBringItems(
  person: PersonProfile,
  date: Date = new Date(),
): string[] {
  const key = getWeekdayKey(date);
  const items = new Set<string>(person.defaultBringItems);
  const schedule = person.schedule;

  if (schedule.type === "school") {
    schedule.week[key]?.lessons.forEach((lesson) =>
      lesson.bringItems?.forEach((i) => items.add(i)),
    );
  } else if (schedule.type === "work") {
    schedule.week[key]?.bringItems?.forEach((i) => items.add(i));
  } else {
    schedule.week[key]?.blocks.forEach((block) =>
      block.bringItems?.forEach((i) => items.add(i)),
    );
  }

  return [...items];
}
