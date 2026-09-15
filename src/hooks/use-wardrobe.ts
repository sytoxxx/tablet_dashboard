"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { PersonId } from "@/lib/types";
import type { WardrobeCatalog, WardrobeItem } from "@/lib/wardrobe/model";
import {
  emptyWardrobeCatalog,
  loadWardrobeCatalog,
  saveWardrobeCatalog,
  wardrobeStorageKey,
} from "@/lib/wardrobe/store";

/** Stable empty catalogs for SSR / getServerSnapshot. */
const EMPTY_BY_PERSON: Record<PersonId, WardrobeCatalog> = {
  levi: emptyWardrobeCatalog("levi"),
  birgit: emptyWardrobeCatalog("birgit"),
  heidi: emptyWardrobeCatalog("heidi"),
};

const clientCache = new Map<string, WardrobeCatalog>();

function cacheKey(personId: PersonId, epoch: number): string {
  return `${personId}:${epoch}`;
}

function subscribeWardrobe(personId: PersonId, onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const key = wardrobeStorageKey(personId);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) onStoreChange();
  };
  const onLocal = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(`wardrobe:${personId}`, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(`wardrobe:${personId}`, onLocal);
  };
}

function readClientCatalog(personId: PersonId, epoch: number): WardrobeCatalog {
  const key = cacheKey(personId, epoch);
  const cached = clientCache.get(key);
  if (cached) return cached;
  const loaded = loadWardrobeCatalog(personId);
  clientCache.set(key, loaded);
  return loaded;
}

/**
 * Person-scoped digital wardrobe (LocalStorage). Isolated per personId.
 */
export function useWardrobe(personId: PersonId) {
  const [epoch, setEpoch] = useState(0);

  const catalog = useSyncExternalStore(
    (onChange) => subscribeWardrobe(personId, onChange),
    () => readClientCatalog(personId, epoch),
    () => EMPTY_BY_PERSON[personId],
  );

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const persist = useCallback(
    (next: WardrobeCatalog) => {
      if (next.personId !== personId) return;
      saveWardrobeCatalog(next);
      setEpoch((e) => {
        const nextEpoch = e + 1;
        clientCache.set(cacheKey(personId, nextEpoch), next);
        return nextEpoch;
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(`wardrobe:${personId}`));
      }
    },
    [personId],
  );

  const replaceCatalog = useCallback(
    (next: WardrobeCatalog) => {
      persist(next);
    },
    [persist],
  );

  const upsertItem = useCallback(
    (item: WardrobeItem) => {
      if (item.personId !== personId) return;
      const current = readClientCatalog(personId, epoch);
      const exists = current.items.some((i) => i.id === item.id);
      const items = exists
        ? current.items.map((i) => (i.id === item.id ? item : i))
        : [...current.items, item];
      persist({
        personId,
        items,
        updatedAt: new Date().toISOString(),
      });
    },
    [personId, persist, epoch],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      const current = readClientCatalog(personId, epoch);
      persist({
        personId,
        items: current.items.filter((i) => i.id !== itemId),
        updatedAt: new Date().toISOString(),
      });
    },
    [personId, persist, epoch],
  );

  return useMemo(
    () => ({
      catalog,
      hydrated,
      replaceCatalog,
      upsertItem,
      removeItem,
    }),
    [catalog, hydrated, replaceCatalog, upsertItem, removeItem],
  );
}
