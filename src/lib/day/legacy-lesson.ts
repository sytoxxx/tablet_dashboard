import type { TimetableEntry } from "@/lib/types";
import { getMinutesSinceMidnight, parseTimeToMinutes } from "@/lib/format";
import { DAY_CONFIG } from "@/lib/day/config";

export function getCurrentOrNextLesson(
  entries: TimetableEntry[],
  now: Date = new Date(),
): { lesson: TimetableEntry; status: "now" | "next" | "done" } | null {
  if (entries.length === 0) return null;
  const current = getMinutesSinceMidnight(now);
  for (let i = 0; i < entries.length; i++) {
    const start = parseTimeToMinutes(entries[i].time);
    const nextStart =
      i + 1 < entries.length
        ? parseTimeToMinutes(entries[i + 1].time)
        : start + DAY_CONFIG.defaultBlockDurationMin;
    if (current >= start && current < nextStart) {
      return { lesson: entries[i], status: "now" };
    }
    if (current < start) {
      return { lesson: entries[i], status: "next" };
    }
  }
  return { lesson: entries[entries.length - 1], status: "done" };
}
