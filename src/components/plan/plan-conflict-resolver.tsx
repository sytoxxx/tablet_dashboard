"use client";

import { Button } from "@/components/ui/button";
import type { PlanConflict } from "@/lib/data/conflicts";
import {
  conflictKey,
  type ConflictResolution,
} from "@/lib/data/conflict-resolution";
import { WEEKDAY_LABELS } from "@/lib/format";

export type { ConflictResolution };

type Props = {
  conflicts: PlanConflict[];
  resolutions: Record<string, ConflictResolution>;
  onChange: (key: string, value: ConflictResolution) => void;
};

export function PlanConflictResolver({ conflicts, resolutions, onChange }: Props) {
  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4">
      <div>
        <p className="text-sm font-semibold text-amber-950">Zeitkonflikte erkannt</p>
        <p className="mt-1 text-sm text-amber-900/80">
          Für jede Überschneidung: behalten, übernehmen oder beide bearbeiten.
        </p>
      </div>
      {conflicts.map((conflict) => {
        const key = conflictKey(conflict);
        const value = resolutions[key] ?? "both";
        return (
          <div key={key} className="rounded-xl border border-amber-200 bg-white/80 p-3">
            <p className="text-xs tracking-[0.12em] text-amber-800/80 uppercase">
              {WEEKDAY_LABELS[conflict.day]} · {conflict.reason}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--ink)]">
              Bestehend: {conflict.existingLabel}
            </p>
            <p className="text-sm font-medium text-[var(--ink)]">
              Neu: {conflict.incomingLabel}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["keep", "Behalten"],
                  ["take", "Übernehmen"],
                  ["both", "Beide bearbeiten"],
                ] as const
              ).map(([res, label]) => (
                <Button
                  key={res}
                  type="button"
                  size="sm"
                  variant={value === res ? "default" : "outline"}
                  onClick={() => onChange(key, res)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
