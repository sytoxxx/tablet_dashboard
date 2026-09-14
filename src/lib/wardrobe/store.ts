/**
 * Person-scoped wardrobe persistence (LocalStorage).
 * Photos are never persisted — only structured garment records.
 */
import type { PersonId } from "@/lib/types";
import type { WardrobeCatalog, WardrobeItem } from "@/lib/wardrobe/model";

const STORAGE_PREFIX = "coffee-morning-wardrobe-v1:";

export function wardrobeStorageKey(personId: PersonId): string {
  return `${STORAGE_PREFIX}${personId}`;
}

export function emptyWardrobeCatalog(personId: PersonId): WardrobeCatalog {
  return { personId, items: [], updatedAt: new Date(0).toISOString() };
}

export function loadWardrobeCatalog(personId: PersonId): WardrobeCatalog {
  if (typeof window === "undefined") return emptyWardrobeCatalog(personId);
  try {
    const raw = window.localStorage.getItem(wardrobeStorageKey(personId));
    if (!raw) return emptyWardrobeCatalog(personId);
    const parsed = JSON.parse(raw) as WardrobeCatalog;
    if (parsed.personId !== personId || !Array.isArray(parsed.items)) {
      return emptyWardrobeCatalog(personId);
    }
    return {
      personId,
      items: parsed.items.filter((i) => i.personId === personId),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return emptyWardrobeCatalog(personId);
  }
}

export function saveWardrobeCatalog(catalog: WardrobeCatalog): void {
  if (typeof window === "undefined") return;
  const cleaned: WardrobeCatalog = {
    personId: catalog.personId,
    items: catalog.items.filter((i) => i.personId === catalog.personId),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    wardrobeStorageKey(catalog.personId),
    JSON.stringify(cleaned),
  );
}

export function createMemoryWardrobeStore(initial?: WardrobeCatalog[]) {
  const map = new Map<PersonId, WardrobeCatalog>();
  for (const c of initial ?? []) map.set(c.personId, structuredClone(c));

  return {
    load(personId: PersonId): WardrobeCatalog {
      return (
        structuredClone(map.get(personId)) ?? emptyWardrobeCatalog(personId)
      );
    },
    save(catalog: WardrobeCatalog) {
      map.set(catalog.personId, {
        personId: catalog.personId,
        items: catalog.items.filter((i) => i.personId === catalog.personId),
        updatedAt: new Date().toISOString(),
      });
    },
    addItem(personId: PersonId, item: WardrobeItem): WardrobeCatalog {
      if (item.personId !== personId) {
        throw new Error("Wardrobe person mismatch");
      }
      const current = this.load(personId);
      const next: WardrobeCatalog = {
        personId,
        items: [...current.items, item],
        updatedAt: new Date().toISOString(),
      };
      this.save(next);
      return next;
    },
    updateItem(
      personId: PersonId,
      itemId: string,
      updater: (item: WardrobeItem) => WardrobeItem,
    ): WardrobeCatalog {
      const current = this.load(personId);
      const next: WardrobeCatalog = {
        personId,
        items: current.items.map((i) =>
          i.id === itemId && i.personId === personId ? updater(i) : i,
        ),
        updatedAt: new Date().toISOString(),
      };
      this.save(next);
      return next;
    },
    clear(personId: PersonId) {
      map.delete(personId);
    },
  };
}

export type MemoryWardrobeStore = ReturnType<typeof createMemoryWardrobeStore>;

export function newWardrobeItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function countActiveBySlot(
  catalog: WardrobeCatalog,
): Record<string, number> {
  const counts: Record<string, number> = {
    top: 0,
    bottom: 0,
    shoes: 0,
    outerwear: 0,
    other: 0,
  };
  for (const item of catalog.items) {
    if (!item.active) continue;
    counts[item.slot] = (counts[item.slot] ?? 0) + 1;
  }
  return counts;
}
