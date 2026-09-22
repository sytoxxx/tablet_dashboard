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

const germanCompactDateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function formatGermanDate(date: Date = new Date()): string {
  return germanDateFormatter.format(date);
}

/** Short secondary-line date next to a large clock, e.g. "Mo., 21. Sept." */
export function formatCompactDate(date: Date = new Date()): string {
  return germanCompactDateFormatter.format(date);
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

/** Wall-clock minutes since midnight in Europe/Vienna (tablet locale). */
export function getViennaMinutesSinceMidnight(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("de-AT", {
    timeZone: "Europe/Vienna",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/**
 * A local Date whose getFullYear/getMonth/getDate/getDay/getHours all read
 * as the Europe/Vienna wall clock, regardless of the device/server's own
 * timezone. Use this before any weekday/ISO-date lookup that must be
 * Vienna-correct (e.g. deciding "today" for the auto-profile picker).
 */
export function viennaWallClockDate(date: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
}

/**
 * Build an absolute ISO timestamp for a Vienna wall-clock HH:MM on the
 * calendar day of `day` (Vienna). Used for TRIAS DepArrTime aiming.
 */
export function viennaWallClockToUtcIso(day: Date, hhmm: string): string {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(day);
  const y = dateParts.find((p) => p.type === "year")?.value;
  const mo = dateParts.find((p) => p.type === "month")?.value;
  const d = dateParts.find((p) => p.type === "day")?.value;
  const [hh, mm] = hhmm.split(":").map(Number);
  // Interpret as Vienna offset via iterative format (handles DST).
  // Start from a UTC guess and adjust.
  let guess = Date.parse(
    `${y}-${mo}-${d}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`,
  );
  for (let i = 0; i < 3; i++) {
    const shown = new Intl.DateTimeFormat("de-AT", {
      timeZone: "Europe/Vienna",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(guess));
    const sh = Number(shown.find((p) => p.type === "hour")?.value ?? 0);
    const sm = Number(shown.find((p) => p.type === "minute")?.value ?? 0);
    const sy = shown.find((p) => p.type === "year")?.value;
    const smo = shown.find((p) => p.type === "month")?.value;
    const sd = shown.find((p) => p.type === "day")?.value;
    const deltaMin =
      (hh * 60 + mm - (sh * 60 + sm)) +
      (y === sy && mo === smo && d === sd
        ? 0
        : y! + mo! + d! > sy! + smo! + sd!
          ? 24 * 60
          : -24 * 60);
    if (deltaMin === 0) break;
    guess += deltaMin * 60_000;
  }
  return new Date(guess).toISOString().replace(/\.\d{3}Z$/, "Z");
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
