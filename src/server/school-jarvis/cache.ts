import type { SchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/types";

type CacheEntry = {
  expiresAt: number;
  summary: SchoolJarvisDailySummary;
};

/**
 * Short-lived in-memory cache for SchoolJarvisDailySummary only.
 * Never stores documents, flashcards, errors, or learning history.
 */
export class SchoolJarvisSummaryCache {
  private readonly store = new Map<string, CacheEntry>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  static key(personId: string, focusDate: string): string {
    return `${personId}:${focusDate}`;
  }

  get(personId: string, focusDate: string): SchoolJarvisDailySummary | null {
    const key = SchoolJarvisSummaryCache.key(personId, focusDate);
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.summary;
  }

  set(
    personId: string,
    focusDate: string,
    summary: SchoolJarvisDailySummary,
    ttlMs: number,
  ): void {
    if (ttlMs <= 0) return;
    this.store.set(SchoolJarvisSummaryCache.key(personId, focusDate), {
      expiresAt: this.now() + ttlMs,
      summary,
    });
  }

  clear(): void {
    this.store.clear();
  }

  /** Test helper */
  size(): number {
    return this.store.size;
  }
}

/** Process-wide cache for the Coffee Morning server. */
export const schoolJarvisSummaryCache = new SchoolJarvisSummaryCache();
