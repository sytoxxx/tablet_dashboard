/**
 * Deriving uncertainty notes purely from an already-parsed entry's own
 * fields — used both by the initial parse (validate.ts) and by full
 * re-validation after the user corrects the recognized year, so both
 * places agree on exactly what "still uncertain" means.
 */
import type { AnalyzedWorkEntry, UncertaintyMark } from "@/lib/plan-analysis/types";

/**
 * Uncertainty inherent to the entry's own content — independent of which
 * calendar year it lands in (unlike a weekday mismatch or a plausibility
 * check against the recognized period, both of which depend on the exact
 * date and must be recomputed after a year correction).
 */
export function baseContentUncertain(
  entry: Pick<AnalyzedWorkEntry, "status" | "location" | "timeUnclear" | "unresolvedCode">,
): boolean {
  if (entry.unresolvedCode || entry.timeUnclear) return true;
  if (entry.status === "work" && (!entry.location || entry.location === "?")) return true;
  return false;
}

/** Human-readable notes for the content-only uncertainty above — regenerated, never stored redundantly. */
export function contentUncertaintyNotes(entry: AnalyzedWorkEntry, path: string): UncertaintyMark[] {
  const notes: UncertaintyMark[] = [];
  if (entry.unresolvedCode && entry.code) {
    notes.push({ path, reason: `Unbekannter Dienstcode „${entry.code}“ — Bedeutung bitte bestätigen` });
  } else if (entry.timeUnclear) {
    notes.push({ path: `${path}.start`, reason: "Zeit nicht eindeutig erkannt oder nicht angegeben" });
  }
  if (entry.status === "work" && (!entry.location || entry.location === "?")) {
    notes.push({ path: `${path}.location`, reason: "Ort unklar oder fehlend" });
  }
  return notes;
}
