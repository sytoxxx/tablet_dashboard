/**
 * Active person selection — LocalStorage, no data mixing between profiles.
 * Person data stays in coffee-morning-data-v2; this only stores which profile is active.
 */
import type { PersonId } from "@/lib/types";

export const ACTIVE_PERSON_STORAGE_KEY = "coffee-morning-active-person";

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

export function setActivePersonId(id: PersonId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_PERSON_STORAGE_KEY, id);
  } catch {
    /* ignore quota */
  }
  for (const l of listeners) l();
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
