/**
 * Active person selection — LocalStorage, no data mixing between profiles.
 * Person data stays in coffee-morning-data-v2; this only stores which profile is active.
 */
import type { PersonId } from "@/lib/types";
import { viennaWallClockDate } from "@/lib/format";
import { toIsoDate } from "@/lib/day/tomorrow";

export const ACTIVE_PERSON_STORAGE_KEY = "coffee-morning-active-person";
/** Vienna calendar date of the last deliberate profile pick — suppresses auto-select for the rest of that day. */
export const MANUAL_OVERRIDE_DATE_KEY = "coffee-morning-manual-override-date";

const listeners = new Set<() => void>();

function isPersonId(value: string | null): value is PersonId {
  return value === "levi" || value === "birgit" || value === "heidi";
}

export function getActivePersonId(): PersonId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_PERSON_STORAGE_KEY);
    return isPersonId(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Every current call site is a deliberate user tap (tile or profile-switcher
 * pill), so this doubles as "record a manual choice" — the auto-select
 * picker must not immediately override it for the rest of the day.
 */
export function setActivePersonId(id: PersonId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_PERSON_STORAGE_KEY, id);
    window.localStorage.setItem(
      MANUAL_OVERRIDE_DATE_KEY,
      toIsoDate(viennaWallClockDate()),
    );
  } catch {
    /* ignore quota */
  }
  for (const l of listeners) l();
}

/** True when a profile was manually chosen already today (Vienna) — auto-select must stand down. */
export function hasManualOverrideToday(now: Date = new Date()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(MANUAL_OVERRIDE_DATE_KEY);
    return stored === toIsoDate(viennaWallClockDate(now));
  } catch {
    return false;
  }
}

export function clearActivePersonId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACTIVE_PERSON_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}

export function subscribeActivePerson(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
