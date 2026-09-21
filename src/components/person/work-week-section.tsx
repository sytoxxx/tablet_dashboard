"use client";

import { useMemo } from "react";
import type { Schedule } from "@/lib/types";
import { Section } from "@/components/section";
import { toIsoDate } from "@/lib/day/tomorrow";
import { buildWorkWeekGlance } from "@/lib/work/schedule";
import { cn } from "@/lib/utils";

type WorkSchedule = Extract<Schedule, { type: "work" }>;

/** Display-only: "08:00–16:00" → "08–16" for landscape density. */
function compactHourRange(hours: string | null): string | null {
  if (!hours) return null;
  return hours.replace(/(\d{1,2}):\d{2}/g, "$1");
}

/**
 * Compact Mon→Sun work glance for Birgit/Heidi only.
 * Mount only from SimpleMorningDashboard — never for Levi.
 */
export function WorkWeekSection({
  schedule,
  today,
  compact = false,
}: {
  schedule: WorkSchedule;
  today: Date;
  /** Landscape tablet: hours like 08–16 / Frei — no status + hours stack. */
  compact?: boolean;
}) {
  const todayIso = toIsoDate(today);
  const days = useMemo(
    () => buildWorkWeekGlance(schedule, today),
    // todayIso (not just weekday) avoids recomputing on Date identity churn
    // within the same day, while still recomputing across calendar weeks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schedule, todayIso],
  );

  return (
    <Section title="Meine Woche" emphasis="tertiary">
      <div className="w-full overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:thin]">
        <ul
          className={cn(
            "grid min-w-[18rem] grid-cols-7 gap-1 sm:min-w-0 sm:gap-1.5",
            compact && "min-w-0 gap-1",
          )}
          aria-label="Wochenübersicht"
        >
          {days.map((d) => {
            const hourLine =
              d.status === "work"
                ? compact
                  ? compactHourRange(d.hours) ?? d.statusLabel
                  : d.hours
                : null;
            const primaryLine =
              d.status === "work"
                ? compact
                  ? hourLine
                  : d.statusLabel
                : d.status === "unknown"
                  ? compact
                    ? "—"
                    : d.statusLabel
                  : d.statusLabel; // free / vacation / sick / other — show the label even when compact

            return (
              <li
                key={d.day}
                className={cn(
                  "min-w-0 rounded-xl border px-1 py-2 text-center sm:px-1.5 sm:py-2.5",
                  compact && "rounded-lg px-0.5 py-1.5 sm:px-1 sm:py-1.5",
                  d.isToday
                    ? "border-[color:var(--ink)]/25 bg-[color:var(--surface)]"
                    : "border-[color:var(--hairline)] bg-transparent",
                )}
              >
                <p
                  className={cn(
                    "text-[0.7rem] font-semibold tracking-[0.08em] uppercase sm:text-xs",
                    compact && "text-[0.65rem] sm:text-[0.7rem]",
                    d.isToday
                      ? "text-[color:var(--ink)]"
                      : "text-[color:var(--quiet)]",
                  )}
                >
                  {d.shortLabel}
                </p>
                <p
                  className={cn(
                    "mt-1 text-[0.7rem] leading-tight sm:text-xs",
                    compact && "mt-0.5 text-[0.7rem] tabular-nums sm:text-[0.75rem]",
                    d.status === "unknown"
                      ? "text-[color:var(--quiet)]"
                      : "text-[color:var(--ink)]",
                  )}
                >
                  {primaryLine}
                </p>
                {!compact && hourLine ? (
                  <p className="mt-0.5 text-[0.65rem] tabular-nums leading-tight text-[color:var(--quiet)] sm:text-[0.7rem]">
                    {hourLine}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
