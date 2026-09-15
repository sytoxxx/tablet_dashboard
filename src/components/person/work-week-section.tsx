"use client";

import { useMemo } from "react";
import type { WeekdayKey, WorkShiftDay } from "@/lib/types";
import { Section } from "@/components/section";
import { getWeekdayKey } from "@/lib/format";
import { buildWorkWeekGlance } from "@/lib/work/schedule";
import { cn } from "@/lib/utils";

/**
 * Compact Mon→Sun work glance for Birgit/Heidi only.
 * Mount only from SimpleMorningDashboard — never for Levi.
 */
export function WorkWeekSection({
  week,
  today,
}: {
  week: Partial<Record<WeekdayKey, WorkShiftDay>>;
  today: Date;
}) {
  const todayKey = getWeekdayKey(today);
  const days = useMemo(
    () => buildWorkWeekGlance(week, today),
    // todayKey avoids recomputing on Date identity churn within the same day.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [week, todayKey],
  );

  return (
    <Section title="Meine Woche" emphasis="tertiary">
      <ul
        className="grid grid-cols-7 gap-1 sm:gap-1.5"
        aria-label="Wochenübersicht"
      >
        {days.map((d) => (
          <li
            key={d.day}
            className={cn(
              "min-w-0 rounded-xl border px-1 py-2 text-center sm:px-1.5 sm:py-2.5",
              d.isToday
                ? "border-[color:var(--ink)]/25 bg-[color:var(--surface)]"
                : "border-[color:var(--hairline)] bg-transparent",
            )}
          >
            <p
              className={cn(
                "text-[0.7rem] font-semibold tracking-[0.08em] uppercase sm:text-xs",
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
                d.status === "unknown"
                  ? "text-[color:var(--quiet)]"
                  : "text-[color:var(--ink)]",
              )}
            >
              {d.statusLabel}
            </p>
            {d.hours ? (
              <p className="mt-0.5 text-[0.65rem] tabular-nums leading-tight text-[color:var(--quiet)] sm:text-[0.7rem]">
                {d.hours}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}
