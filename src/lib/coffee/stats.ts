import type { PersonId } from "@/lib/types";
import type {
  CoffeeBean,
  CoffeeBrew,
  CoffeePeriodStats,
} from "@/lib/coffee/types";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeekMonday(d: Date): Date {
  const day = startOfLocalDay(d);
  const dow = day.getDay(); // 0 Sun
  const offset = dow === 0 ? 6 : dow - 1;
  day.setDate(day.getDate() - offset);
  return day;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function filterBrewsSince(
  brews: CoffeeBrew[],
  since: Date,
  until: Date = new Date(),
): CoffeeBrew[] {
  const from = since.getTime();
  const to = until.getTime();
  return brews.filter((b) => {
    const t = Date.parse(b.brewedAt);
    return Number.isFinite(t) && t >= from && t <= to;
  });
}

export function computePeriodStats(brews: CoffeeBrew[]): CoffeePeriodStats {
  const byPerson: Partial<Record<PersonId, number>> = {};
  const byBean: Record<string, number> = {};
  const byMethod: CoffeePeriodStats["byMethod"] = {};
  let durationSum = 0;
  let durationCount = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  for (const brew of brews) {
    byPerson[brew.personId] = (byPerson[brew.personId] ?? 0) + 1;
    byMethod[brew.method] = (byMethod[brew.method] ?? 0) + 1;
    if (brew.beanId) {
      byBean[brew.beanId] = (byBean[brew.beanId] ?? 0) + 1;
    }
    if (brew.durationSeconds > 0) {
      durationSum += brew.durationSeconds;
      durationCount += 1;
    }
    if (typeof brew.rating === "number") {
      ratingSum += brew.rating;
      ratingCount += 1;
    }
  }

  let mostDrunkBeanId: string | null = null;
  let most = 0;
  for (const [beanId, count] of Object.entries(byBean)) {
    if (count > most) {
      most = count;
      mostDrunkBeanId = beanId;
    }
  }

  return {
    total: brews.length,
    byPerson,
    byBean,
    byMethod,
    avgDurationSeconds: durationCount ? Math.round(durationSum / durationCount) : null,
    avgRating: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    mostDrunkBeanId,
  };
}

export function statsForToday(brews: CoffeeBrew[], now = new Date()) {
  return computePeriodStats(filterBrewsSince(brews, startOfLocalDay(now), now));
}

export function statsForWeek(brews: CoffeeBrew[], now = new Date()) {
  return computePeriodStats(filterBrewsSince(brews, startOfWeekMonday(now), now));
}

export function statsForMonth(brews: CoffeeBrew[], now = new Date()) {
  return computePeriodStats(filterBrewsSince(brews, startOfMonth(now), now));
}

export function lastBrew(brews: CoffeeBrew[]): CoffeeBrew | null {
  if (!brews.length) return null;
  return [...brews].sort(
    (a, b) => Date.parse(b.brewedAt) - Date.parse(a.brewedAt),
  )[0] ?? null;
}

export function beanLabel(
  beans: CoffeeBean[],
  beanId: string | null | undefined,
): string {
  if (!beanId) return "Ohne Bohne";
  return beans.find((b) => b.id === beanId)?.name ?? "Unbekannte Bohne";
}
