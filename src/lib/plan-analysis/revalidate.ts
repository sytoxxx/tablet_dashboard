/**
 * Full re-validation after the user corrects the recognized year — the one
 * thing the initial parse could get wrong on the very axis it was already
 * flagged uncertain about. A year change shifts every date, which can flip
 * weekday-match results and change which entries fall inside/outside the
 * recognized period; both must be recomputed from scratch rather than
 * carrying over conclusions the old year produced. Duplicate-date and
 * shift-length plausibility are year-independent and are simply re-run
 * fresh (cheap, and correct either way).
 */
import type { AnalyzedWorkEntry, PlanPeriod, UncertaintyMark } from "@/lib/plan-analysis/types";
import { computePeriod, weekdayMatches } from "@/lib/plan-analysis/plan-date";
import { checkPlausibility } from "@/lib/plan-analysis/plausibility";
import { contentUncertaintyNotes } from "@/lib/plan-analysis/entry-uncertainty";

export type RevalidatedWorkDraft = {
  entries: AnalyzedWorkEntry[];
  period: PlanPeriod;
  /** Complete replacement for the draft's per-entry uncertainty notes. */
  uncertainties: UncertaintyMark[];
};

export function revalidateWorkDraftForYear(
  entries: AnalyzedWorkEntry[],
  year: number,
): RevalidatedWorkDraft {
  // Step 1: shift every date to the confirmed year, keep month/day as read.
  const remapped = entries.map((e) => ({ ...e, date: `${year}-${e.date.slice(5)}` }));

  // Step 2: weekday-match is date-dependent — recompute per entry from the
  // year-independent baseline (baseUncertain), never from the stale flag.
  const withWeekday = remapped.map((e) => {
    const weekdayMismatch = e.weekday ? !weekdayMatches(e.date, e.weekday) : false;
    return { ...e, uncertain: (e.baseUncertain ?? false) || weekdayMismatch };
  });

  // Step 3: period and plausibility (duplicates, shift length, period range)
  // — all re-derived fresh from the corrected dates, never reused from before.
  const period = computePeriod(withWeekday, false); // user just confirmed it explicitly
  const { entries: finalEntries, uncertainties: plausibilityNotes } = checkPlausibility(
    withWeekday,
    period,
  );

  const weekdayNotes: UncertaintyMark[] = [];
  const contentNotes: UncertaintyMark[] = [];
  finalEntries.forEach((e, index) => {
    const path = `entries.${index}`;
    if (e.weekday && !weekdayMatches(e.date, e.weekday)) {
      weekdayNotes.push({ path: `${path}.date`, reason: "Wochentag passt nicht zum Datum" });
    }
    contentNotes.push(...contentUncertaintyNotes(e, path));
  });

  return {
    entries: finalEntries,
    period,
    uncertainties: [...contentNotes, ...weekdayNotes, ...plausibilityNotes],
  };
}
