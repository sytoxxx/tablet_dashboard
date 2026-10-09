"use client";

import { Button } from "@/components/ui/button";
import type { PlanConflict } from "@/lib/data/conflicts";
import {
  conflictKey,
  type ConflictResolution,
} from "@/lib/data/conflict-resolution";
import { WEEKDAY_LABELS } from "@/lib/format";

function formatIsoDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export type { ConflictResolution };

type Props = {
  conflicts: PlanConflict[];
  resolutions: Record<string, ConflictResolution>;
  onChange: (key: string, value: ConflictResolution) => void;
  /**
   * Compare-and-confirm mode (text import): nothing is pre-selected, only "keep existing" / "take new"
   * exist, and the caller blocks saving until every day has been decided.
   */
  requireChoice?: boolean;
  onChangeAll?: (value: "keep" | "take") => void;
};

export function PlanConflictResolver({ conflicts, resolutions, onChange, requireChoice, onChangeAll }: Props) {
  if (conflicts.length === 0) return null;
  const choices = requireChoice
    ? ([
        ["keep", "Bestehendes behalten"],
        ["take", "Neuen übernehmen"],
      ] as const)
    : ([
        ["keep", "Behalten"],
        ["take", "Übernehmen"],
        ["both", "Beide bearbeiten"],
      ] as const);

  return (
    <div className="space-y-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4">
      <div>
        <p className="text-sm font-semibold text-amber-950">
          {requireChoice ? "Diese Tage sind schon gespeichert — und anders" : "Zeitkonflikte erkannt"}
        </p>
        <p className="mt-1 text-sm text-amber-900/80">
          {requireChoice
            ? "Für jeden Tag bitte wählen, was gelten soll. Erst danach kann gespeichert werden."
            : "Für jede Überschneidung: behalten, übernehmen oder beide bearbeiten."}
        </p>
        {requireChoice && onChangeAll ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="h-11 rounded-xl px-4" onClick={() => onChangeAll("take")}>
              Alle neu übernehmen
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-11 rounded-xl px-4" onClick={() => onChangeAll("keep")}>
              Alle bestehenden behalten
            </Button>
          </div>
        ) : null}
      </div>
      {conflicts.map((conflict) => {
        const key = conflictKey(conflict);
        const value = requireChoice ? resolutions[key] : (resolutions[key] ?? "both");
        return (
          <div key={key} className="rounded-xl border border-amber-200 bg-white/80 p-3">
            <p className="text-xs tracking-[0.12em] text-amber-800/80 uppercase">
              {WEEKDAY_LABELS[conflict.day]}
              {conflict.date ? ` · ${formatIsoDisplay(conflict.date)}` : ""} · {conflict.reason}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--ink)]">
              Bestehend: {conflict.existingLabel}
            </p>
            <p className="text-sm font-medium text-[var(--ink)]">
              Neu: {conflict.incomingLabel}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {choices.map(([res, label]) => (
                <Button
                  key={res}
                  type="button"
                  size="sm"
                  className={requireChoice ? "h-11 rounded-xl px-4" : undefined}
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
