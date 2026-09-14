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

const germanTimeShortFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatGermanDate(date: Date = new Date()): string {
  return germanDateFormatter.format(date);
}

export function formatGermanTime(date: Date = new Date()): string {
  return germanTimeFormatter.format(date);
}

export function formatGermanTimeShort(date: Date = new Date()): string {
  return germanTimeShortFormatter.format(date);
}

export function formatMinutesUntil(minutes: number): string {
  if (minutes <= 0) return "jetzt";
  if (minutes === 1) return "in 1 Min.";
  return `in ${minutes} Min.`;
}

export function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Parse "HH:MM" into minutes since midnight. */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function getMinutesSinceMidnight(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}
