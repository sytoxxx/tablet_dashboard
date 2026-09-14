import type { AppData, DataRepository } from "@/lib/types";
import { seedAppData } from "@/data/seed";
import { migrateAppData, validateAppDataImport } from "@/lib/data/validate-app-data";

export const STORAGE_KEY = "coffee-morning-data-v2";

function cloneSeed(): AppData {
  return structuredClone(seedAppData);
}

function normalizeLoaded(parsed: unknown): AppData {
  const validated = validateAppDataImport(parsed);
  if (validated.ok) return validated.data;
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as AppData).persons)
  ) {
    try {
      return migrateAppData(parsed as AppData);
    } catch {
      return cloneSeed();
    }
  }
  return cloneSeed();
}

/** In-memory fallback (SSR / private mode). */
export class MemoryRepository implements DataRepository {
  private data: AppData;

  constructor(initial?: AppData) {
    this.data = initial ? structuredClone(initial) : cloneSeed();
  }

  load(): AppData {
    return structuredClone(this.data);
  }

  save(data: AppData): void {
    this.data = structuredClone(data);
  }

  clear(): void {
    this.data = cloneSeed();
  }
}

/** Browser LocalStorage adapter — swap later for API repository. */
export class LocalStorageRepository implements DataRepository {
  load(): AppData {
    if (typeof window === "undefined") return cloneSeed();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return cloneSeed();
      return normalizeLoaded(JSON.parse(raw));
    } catch {
      return cloneSeed();
    }
  }

  save(data: AppData): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  clear(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function createDefaultRepository(): DataRepository {
  if (typeof window === "undefined") return new MemoryRepository();
  return new LocalStorageRepository();
}
