import type { PlanConflict } from "@/lib/data/conflicts";

export type ConflictResolution = "keep" | "take" | "both";

export function conflictKey(c: PlanConflict): string {
  return `${c.day}|${c.existingLabel}|${c.incomingLabel}`;
}
