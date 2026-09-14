import { DAY_CONFIG } from "@/lib/day/config";
import { getWeekdayKey } from "@/lib/format";
import type { WeekdayKey } from "@/lib/types";

export type RelativeDayFocus = {
  wallNow: Date;
  focusDate: Date;
  focusIsTomorrow: boolean;
  focusWeekdayKey: WeekdayKey;
  wallWeekdayKey: WeekdayKey;
  focusRelativeLabel: "Heute" | "Morgen";
  crossedMidnight: boolean;
};

/**
 * Resolve focus day from live wall clock.
 * Survives an app left open overnight — always recomputed from `wallNow`.
 */
export function resolveRelativeDayFocus(
  wallNow: Date = new Date(),
  previousWallNow?: Date | null,
): RelativeDayFocus {
  const hour = wallNow.getHours();
  const focusIsTomorrow = hour >= DAY_CONFIG.eveningTomorrowHour;
  const focusDate = new Date(wallNow);
  if (focusIsTomorrow) {
    focusDate.setDate(focusDate.getDate() + 1);
    focusDate.setHours(12, 0, 0, 0);
  }

  let crossedMidnight = false;
  if (previousWallNow) {
    crossedMidnight =
      previousWallNow.getFullYear() !== wallNow.getFullYear() ||
      previousWallNow.getMonth() !== wallNow.getMonth() ||
      previousWallNow.getDate() !== wallNow.getDate();
  }

  return {
    wallNow,
    focusDate,
    focusIsTomorrow,
    focusWeekdayKey: getWeekdayKey(focusDate),
    wallWeekdayKey: getWeekdayKey(wallNow),
    focusRelativeLabel: focusIsTomorrow ? "Morgen" : "Heute",
    crossedMidnight,
  };
}

/** Format age of a cached fetch for friendly offline copy. */
export function formatDataAge(
  fetchedAtIso: string | null | undefined,
  now = new Date(),
): string | null {
  if (!fetchedAtIso) return null;
  const t = new Date(fetchedAtIso).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.max(0, Math.round((now.getTime() - t) / 60_000));
  if (mins < 1) return "gerade eben";
  if (mins === 1) return "vor 1 Min.";
  return `vor ${mins} Min.`;
}
