import type { UntisEvent } from "@/lib/untis/ical";
import { shiftIso, trimEventWindow } from "@/lib/untis/select";
import type { UntisStored } from "@/lib/untis/store";

type Success = NonNullable<UntisStored["lastSuccess"]>;

/** What to keep from a fresh download: a bounded window plus the dates the full feed really covered. */
export function buildSuccess(
  full: UntisEvent[],
  warnings: string[],
  fetchedAt: number,
  todayIso: string,
): Success {
  const dates = full.map((e) => e.date).sort();
  const first = dates[0];
  const last = dates.at(-1);
  const windowStart = shiftIso(todayIso, -1);
  const windowEnd = shiftIso(todayIso, 14);
  let coverage: Success["coverage"] = null;
  if (first && last && last >= windowStart) {
    coverage = {
      start: first > windowStart ? first : windowStart,
      end: last < windowEnd ? last : windowEnd,
    };
  }
  return { fetchedAt, events: trimEventWindow(full, todayIso), warnings, coverage };
}
