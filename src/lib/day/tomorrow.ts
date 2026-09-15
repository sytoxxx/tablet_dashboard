import { DAY_CONFIG } from "@/lib/day/config";
import { getWeekdayKey } from "@/lib/format";
import type { WeekdayKey } from "@/lib/types";

export type FocusMoment = {
  /** Calendar date the dashboard should emphasize (today or tomorrow). */
  focusDate: Date;
  /** Wall-clock “now” used for bus/current-block math. */
  now: Date;
  isTomorrowFocus: boolean;
  focusWeekdayKey: WeekdayKey;
};

/**
 * After eveningTomorrowHour, morning glance shifts to tomorrow’s plan
 * while bus “next” still uses real now.
 */
export function resolveFocusMoment(now: Date = new Date()): FocusMoment {
  const hour = now.getHours();
  const isTomorrowFocus = hour >= DAY_CONFIG.eveningTomorrowHour;
  const focusDate = new Date(now);
  if (isTomorrowFocus) {
    focusDate.setDate(focusDate.getDate() + 1);
    focusDate.setHours(12, 0, 0, 0);
  }
  return {
    focusDate,
    now,
    isTomorrowFocus,
    focusWeekdayKey: getWeekdayKey(focusDate),
  };
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
