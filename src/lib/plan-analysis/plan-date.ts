import type { WeekdayKey } from "@/lib/types";
import { getWeekdayKey } from "@/lib/format";
import type { AnalyzedWorkEntry, PlanPeriod } from "@/lib/plan-analysis/types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_RE.test(value);
}

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Resolves day/month(/year) from an uploaded plan to a real ISO date.
 * Never invents a day or month — only fills in a missing year, choosing
 * whichever of (refYear-1, refYear, refYear+1) lands closest to the
 * reference date. Rejects a day/month combination that isn't a real date
 * (e.g. 31 April) instead of silently rolling it over.
 */
export function resolvePlanDate(
  input: { day: number; month: number; year?: number },
  referenceDate: Date,
): string | null {
  const { day, month } = input;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;

  const candidateYears =
    input.year && Number.isInteger(input.year)
      ? [input.year]
      : [
          referenceDate.getFullYear() - 1,
          referenceDate.getFullYear(),
          referenceDate.getFullYear() + 1,
        ];

  let best: { date: Date; diff: number } | null = null;
  for (const year of candidateYears) {
    const date = new Date(year, month - 1, day);
    // Reject rollover (e.g. 31 April -> 1 May): the constructed date must
    // echo back the same day/month we were given.
    if (date.getMonth() !== month - 1 || date.getDate() !== day) continue;
    const diff = Math.abs(date.getTime() - referenceDate.getTime());
    if (!best || diff < best.diff) best = { date, diff };
  }

  return best ? isoOf(best.date) : null;
}

/** True when the plan's own printed weekday matches the resolved date. */
export function weekdayMatches(iso: string, weekday: WeekdayKey): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, m! - 1, d);
  return getWeekdayKey(date) === weekday;
}

/**
 * The document's declared month/year, derived from the entries' own resolved
 * dates — never from a top-level AI claim. `yearCertain` is false whenever
 * any entry needed its year inferred (never actually read from the plan);
 * `monthCertain` is false only when the entries genuinely span more than one
 * month (a legitimate multi-month roster, not an error).
 */
export function computePeriod(entries: AnalyzedWorkEntry[], yearInferred: boolean): PlanPeriod {
  if (entries.length === 0) {
    return { month: null, year: null, yearCertain: false, monthCertain: false };
  }
  const months = new Set(entries.map((e) => Number(e.date.slice(5, 7))));
  const years = new Set(entries.map((e) => Number(e.date.slice(0, 4))));
  return {
    month: months.size === 1 ? [...months][0]! : null,
    year: years.size === 1 ? [...years][0]! : null,
    monthCertain: months.size === 1,
    yearCertain: !yearInferred && years.size === 1,
  };
}
