/**
 * Time-of-day greeting buckets from the real local clock.
 * Boundaries are inclusive of start hour, exclusive of end (except night wrap).
 */
export type GreetingBucket = "morning" | "day" | "evening" | "night";

export type GreetingSnapshot = {
  key: GreetingBucket;
  salutation: string;
  emoji: string;
  /** Full “☀️ Guten Morgen, Name” line */
  line: (name: string) => string;
};

/** @deprecated Prefer GreetingBucket — kept for overview/daypart callers. */
export type DaypartGreeting = "morning" | "day" | "evening";

const BUCKET: Record<
  GreetingBucket,
  { salutation: string; emoji: string }
> = {
  morning: { salutation: "Guten Morgen", emoji: "☀️" },
  day: { salutation: "Guten Tag", emoji: "🌤️" },
  evening: { salutation: "Guten Abend", emoji: "🌆" },
  night: { salutation: "Gute Nacht", emoji: "🌙" },
};

/**
 * 05:00–11:59 morning · 12:00–17:59 day · 18:00–21:59 evening · 22:00–04:59 night
 */
export function resolveGreetingBucket(now: Date = new Date()): GreetingBucket {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "day";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

export function greetingSnapshot(now: Date = new Date()): GreetingSnapshot {
  const key = resolveGreetingBucket(now);
  const { salutation, emoji } = BUCKET[key];
  return {
    key,
    salutation,
    emoji,
    line: (name: string) => `${emoji} ${salutation}, ${name}`,
  };
}

/** Milliseconds until the next greeting-bucket boundary (local clock). */
export function msUntilNextGreetingBucket(now: Date = new Date()): number {
  const next = new Date(now.getTime());
  next.setSeconds(0, 0);
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) {
    next.setHours(12, 0, 0, 0);
  } else if (hour >= 12 && hour < 18) {
    next.setHours(18, 0, 0, 0);
  } else if (hour >= 18 && hour < 22) {
    next.setHours(22, 0, 0, 0);
  } else if (hour >= 22) {
    next.setDate(next.getDate() + 1);
    next.setHours(5, 0, 0, 0);
  } else {
    // 00–04 → 05:00 same day
    next.setHours(5, 0, 0, 0);
  }
  const ms = next.getTime() - now.getTime();
  return Math.max(ms, 1_000);
}

/** Legacy daypart for evening-tomorrow logic (night counts as evening). */
export function resolveDaypart(now: Date = new Date()): DaypartGreeting {
  const bucket = resolveGreetingBucket(now);
  if (bucket === "morning") return "morning";
  if (bucket === "day") return "day";
  return "evening";
}

export function daypartSalutation(now: Date = new Date()): string {
  return greetingSnapshot(now).salutation;
}

/** Personalized headline — emoji + salutation + name. */
export function personalizedGreeting(
  name: string,
  now: Date = new Date(),
): string {
  return greetingSnapshot(now).line(name);
}
