import type { UntisEvent } from "@/lib/untis/ical";

export function eventsForDate(events: UntisEvent[], iso: string): UntisEvent[] {
  return events.filter((e) => e.date === iso).sort((a, b) => a.start.localeCompare(b.start));
}

/** Keeps a bounded window so the stored copy stays small: yesterday … +14 days. */
export function trimEventWindow(events: UntisEvent[], todayIso: string): UntisEvent[] {
  const from = shiftIso(todayIso, -1);
  const to = shiftIso(todayIso, 14);
  return events.filter((e) => e.date >= from && e.date <= to);
}

export function shiftIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d! + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export const STALE_AFTER_MIN = 45;

/** "vor 5 Min." / "heute 07:12" / "gestern 18:40" — always says how old the data is. */
export function ageLabel(fetchedAtMs: number, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - fetchedAtMs) / 60000));
  const at = new Date(fetchedAtMs);
  const hhmm = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min. (${hhmm})`;
  const sameDay = at.toDateString() === now.toDateString();
  if (sameDay) return `heute ${hhmm}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (at.toDateString() === yesterday.toDateString()) return `gestern ${hhmm}`;
  return `${String(at.getDate()).padStart(2, "0")}.${String(at.getMonth() + 1).padStart(2, "0")}. ${hhmm}`;
}

export function isOutdated(fetchedAtMs: number, now: Date): boolean {
  return now.getTime() - fetchedAtMs > STALE_AFTER_MIN * 60000;
}
