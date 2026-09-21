/**
 * Decides whether an analysis result is trustworthy enough to show as a
 * draft at all, or whether the photo itself needs to be retaken. Looks at
 * the actual PATTERN of unreadable entries — never a single low confidence
 * number alone, per explicit product requirement: a photo that's 90% clean
 * with one blurry corner must not be thrown away, but a photo where most of
 * the plan genuinely couldn't be read must never be handed to the user as
 * if it were a normal draft to fine-tune.
 */
import type { PlanAnalysisResult } from "@/lib/plan-analysis/types";

export type ReliabilityAssessment = { reliable: true } | { reliable: false; reason: string };

const RETAKE_MESSAGE =
  "Der Dienstplan ist nicht eindeutig lesbar. Bitte fotografiere ihn vollständig, gerade und bei gutem Licht noch einmal.";

/** Share of entries with a genuine "couldn't determine this" signal above which the whole photo is untrustworthy. */
const HARD_PROBLEM_RATIO_THRESHOLD = 0.5;
/** Only combined with at least one real hard problem — never a trigger by itself. */
const VERY_LOW_CONFIDENCE = 0.3;

export function assessReliability(result: PlanAnalysisResult): ReliabilityAssessment {
  if (result.mode !== "work" || result.draft.type !== "work") return { reliable: true };

  const entries = result.draft.entries;
  const total = entries.length;
  if (total === 0) return { reliable: true }; // validate.ts already rejects an empty draft earlier

  const hardProblems = entries.filter((e) => e.timeUnclear || e.unresolvedCode).length;
  const hardRatio = hardProblems / total;
  const allFlagged = total > 1 && entries.every((e) => e.uncertain);

  const unreliable =
    hardRatio > HARD_PROBLEM_RATIO_THRESHOLD ||
    allFlagged ||
    (result.confidence < VERY_LOW_CONFIDENCE && hardProblems > 0);

  return unreliable ? { reliable: false, reason: RETAKE_MESSAGE } : { reliable: true };
}
