import type { UntisEvent } from "@/lib/untis/ical";

export const UNTIS_STORAGE_KEY = "coffee-morning-untis-v1";

export type UntisStored = {
  /** The private iCal link (kept on this tablet only; sent to our own server, never shown again). */
  url: string | null;
  /** Last successful download — kept when a later refresh fails. */
  lastSuccess: {
    fetchedAt: number;
    events: UntisEvent[];
    warnings: string[];
    /** Dates the feed really covered (see school-day.ts). Missing in older saves → derived from events. */
    coverage?: { start: string; end: string } | null;
  } | null;
};

export const EMPTY_STORED: UntisStored = { url: null, lastSuccess: null };

export function loadUntis(): UntisStored {
  try {
    const raw = window.localStorage.getItem(UNTIS_STORAGE_KEY);
    if (!raw) return EMPTY_STORED;
    const p = JSON.parse(raw) as Partial<UntisStored>;
    return {
      url: typeof p.url === "string" && p.url ? p.url : null,
      lastSuccess:
        p.lastSuccess && typeof p.lastSuccess.fetchedAt === "number" && Array.isArray(p.lastSuccess.events)
          ? { fetchedAt: p.lastSuccess.fetchedAt, events: p.lastSuccess.events, warnings: p.lastSuccess.warnings ?? [], coverage: p.lastSuccess.coverage ?? null }
          : null,
    };
  } catch {
    return EMPTY_STORED;
  }
}

export function saveUntis(next: UntisStored): void {
  try {
    window.localStorage.setItem(UNTIS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("coffee-morning-untis"));
  } catch {
    /* private mode / quota: the link then only lives until reload */
  }
}

export function clearUntis(): void {
  try {
    window.localStorage.removeItem(UNTIS_STORAGE_KEY);
    window.dispatchEvent(new Event("coffee-morning-untis"));
  } catch {
    /* ignore */
  }
}
