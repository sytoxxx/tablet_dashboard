const germanDateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatGermanDate(date: Date = new Date()): string {
  return germanDateFormatter.format(date);
}

export function formatMinutesUntil(minutes: number): string {
  if (minutes <= 0) return "jetzt";
  if (minutes === 1) return "in 1 Min.";
  return `in ${minutes} Min.`;
}
