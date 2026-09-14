import { DAY_CONFIG } from "@/lib/day/config";

export type DaypartGreeting = "morning" | "day" | "evening";

export function resolveDaypart(now: Date = new Date()): DaypartGreeting {
  const hour = now.getHours();
  if (hour < 11) return "morning";
  if (hour < DAY_CONFIG.eveningTomorrowHour) return "day";
  return "evening";
}

/** Short daypart salutation for person dashboards. */
export function daypartSalutation(now: Date = new Date()): string {
  const part = resolveDaypart(now);
  if (part === "morning") return "Guten Morgen";
  if (part === "evening") return "Guten Abend";
  return "Hallo";
}

/** Personalized headline without tech jargon. */
export function personalizedGreeting(name: string, now: Date = new Date()): string {
  return `${daypartSalutation(now)}, ${name}`;
}
