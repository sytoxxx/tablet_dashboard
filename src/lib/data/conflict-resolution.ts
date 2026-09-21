import type { PlanConflict } from "@/lib/data/conflicts";

export type ConflictResolution = "keep" | "take" | "both";

export function conflictKey(c: PlanConflict): string {
  // Include the real date when present — two different weeks can otherwise
  // show the identical recurring shift on the same weekday and collide.
  return `${c.date ?? c.day}|${c.existingLabel}|${c.incomingLabel}`;
}
