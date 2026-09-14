import type { WeekdayKey } from "@/lib/types";

const germanDateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const germanTimeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatGermanDate(date: Date = new Date()): string {
  return germanDateFormatter.format(date);
}

export function formatGermanTime(date: Date = new Date()): string {
  return germanTimeFormatter.format(date);
}

export function formatMinutesUntil(minutes: number): string {
  if (minutes <= 0) return "jetzt";
  if (minutes === 1) return "in 1 Min.";
  return `in ${minutes} Min.`;
}

/** Relative status for schedule blocks on the morning tablet. */
export function formatRelativeBlockStatus(
  kind: "current" | "next" | "done" | "free",
  minutesUntilStart?: number,
): string {
  if (kind === "current") return "läuft gerade";
  if (kind === "done") return "erledigt";
  if (kind === "free") return "frei";
  if (minutesUntilStart === undefined) return "Als Nächstes";
  if (minutesUntilStart <= 0) return "gleich";
  return formatMinutesUntil(minutesUntilStart);
}

export function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Format minutes-since-midnight as HH:MM (wraps across midnight). */
export function minutesToHHmm(totalMinutes: number): string {
  const day = 24 * 60;
  const normalized = ((Math.trunc(totalMinutes) % day) + day) % day;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getMinutesSinceMidnight(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

const JS_DAY_TO_KEY: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function getWeekdayKey(date: Date = new Date()): WeekdayKey {
  return JS_DAY_TO_KEY[date.getDay()] ?? "mon";
}

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: "Montag",
  tue: "Dienstag",
  wed: "Mittwoch",
  thu: "Donnerstag",
  fri: "Freitag",
  sat: "Samstag",
  sun: "Sonntag",
};

export const WEEKDAY_ORDER: WeekdayKey[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];
