/**
 * Second-pass sanity checks over an already-parsed work-plan draft. Runs
 * after `validatePlanAnalysis` has turned raw AI/mock output into real
 * dated entries. Never rejects the whole draft — flags individual entries
 * (`uncertain: true`) and returns human-readable reasons so the preview UI
 * can surface them, per "Plausibilitätsprüfung > Rückfrage, nie stillschweigend speichern".
 */
import type { AnalyzedWorkEntry, PlanPeriod, UncertaintyMark } from "@/lib/plan-analysis/types";
import { parseTimeToMinutes } from "@/lib/format";

const MIN_SHIFT_MINUTES = 60; // shorter than 1h is almost certainly a misread
const MAX_SHIFT_MINUTES = 16 * 60; // longer than 16h is almost certainly a misread

function shiftLengthMinutes(start: string, end: string): number {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  // end < start is treated as an overnight shift (crosses midnight), not an error.
  return e > s ? e - s : 24 * 60 - s + e;
}

/**
 * Mutates a copy of `entries` with additional `uncertain` flags and returns
 * the matching uncertainty notes. Pure — does not touch the input array.
 */
export function checkPlausibility(
  entries: AnalyzedWorkEntry[],
  period: PlanPeriod | null,
): { entries: AnalyzedWorkEntry[]; uncertainties: UncertaintyMark[] } {
  const next = entries.map((e) => ({ ...e }));
  const uncertainties: UncertaintyMark[] = [];
  const seenDates = new Map<string, number>();

  next.forEach((entry, index) => {
    const path = `entries.${index}`;

    // Duplicate calendar date — two rows claiming the same day is a real conflict, not noise.
    const firstIndex = seenDates.get(entry.date);
    if (firstIndex === undefined) {
      seenDates.set(entry.date, index);
    } else {
      entry.uncertain = true;
      next[firstIndex]!.uncertain = true;
      uncertainties.push({
        path,
        reason: `Datum doppelt vergeben (auch in Zeile ${firstIndex + 1})`,
      });
    }

    // Date falls outside the document's own declared/certain month — flag, don't drop
    // (a plan can legitimately span a month change, so this is a review hint, not an error).
    if (period?.year != null && period.month != null && period.yearCertain && period.monthCertain) {
      const [y, m] = entry.date.split("-").map(Number);
      if (y !== period.year || m !== period.month) {
        entry.uncertain = true;
        uncertainties.push({
          path: `${path}.date`,
          reason: `Datum liegt außerhalb des erkannten Zeitraums (${String(period.month).padStart(2, "0")}/${period.year})`,
        });
      }
    }

    if (entry.status !== "work") return;
    if (!entry.start || !entry.end) return; // already flagged as timeUnclear elsewhere

    const length = shiftLengthMinutes(entry.start, entry.end);
    if (length < MIN_SHIFT_MINUTES) {
      entry.uncertain = true;
      uncertainties.push({
        path: `${path}.end`,
        reason: `Ungewöhnlich kurze Schicht (${length} Min.) — bitte Zeiten prüfen`,
      });
    } else if (length > MAX_SHIFT_MINUTES) {
      entry.uncertain = true;
      uncertainties.push({
        path: `${path}.end`,
        reason: `Ungewöhnlich lange Schicht (über 16 Std.) — bitte Zeiten prüfen`,
      });
    }
  });

  return { entries: next, uncertainties };
}
