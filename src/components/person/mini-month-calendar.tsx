"use client";

import { useMemo } from "react";
import type { MonthHighlight } from "@/lib/day/intelligence";
import { toIsoDate } from "@/lib/day/tomorrow";
import { Section } from "@/components/section";
import { cn } from "@/lib/utils";

const DOW = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type MiniMonthCalendarProps = {
  focusDate: Date;
  today: Date;
  highlights: MonthHighlight[];
};

export function MiniMonthCalendar({
  focusDate,
  today,
  highlights,
}: MiniMonthCalendarProps) {
  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    // Monday-first index
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const highlightMap = new Map(highlights.map((h) => [h.isoDate, h.label]));
    const list: {
      day: number | null;
      iso: string | null;
      isToday: boolean;
      isFocus: boolean;
      label?: string;
    }[] = [];

    for (let i = 0; i < startPad; i++) {
      list.push({ day: null, iso: null, isToday: false, isFocus: false });
    }
    const todayIso = toIsoDate(today);
    const focusIso = toIsoDate(focusDate);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const iso = toIsoDate(date);
      list.push({
        day: d,
        iso,
        isToday: iso === todayIso,
        isFocus: iso === focusIso,
        label: highlightMap.get(iso),
      });
    }
    return list;
  }, [year, month, focusDate, today, highlights]);

  const title = focusDate.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  return (
    <Section title="Kalender">
      <p className="mb-3 capitalize text-[color:var(--quiet)]">{title}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[color:var(--quiet)]">
        {DOW.map((d) => (
          <span key={d} className="py-1 font-medium">
            {d}
          </span>
        ))}
        {cells.map((cell, index) => (
          <div
            key={index}
            title={cell.label}
            className={cn(
              "relative flex aspect-square items-center justify-center rounded-lg text-sm",
              cell.day && "text-[color:var(--ink)]",
              cell.isToday && "bg-[color:var(--brand)] font-semibold text-white",
              cell.isFocus && !cell.isToday && "ring-2 ring-[color:var(--brand)]/40",
              cell.label && !cell.isToday && "font-medium",
            )}
          >
            {cell.day ?? ""}
            {cell.label ? (
              <span
                className={cn(
                  "absolute bottom-1 size-1 rounded-full",
                  cell.isToday ? "bg-white" : "bg-[color:var(--brand)]",
                )}
                aria-hidden
              />
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-[color:var(--quiet)]">
        Punkte = wiederkehrende oder datierte Termine · keine volle Kalender-App.
      </p>
    </Section>
  );
}
