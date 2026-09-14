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

function subscribeWardrobe(personId: PersonId, onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const key = wardrobeStorageKey(personId);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(`wardrobe:${personId}`, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(`wardrobe:${personId}`, onStoreChange);
  };
}

function readWardrobe(personId: PersonId): WardrobeCatalog {
  if (typeof window === "undefined") return emptyWardrobeCatalog(personId);
  return loadWardrobeCatalog(personId);
}

/**
 * Person-scoped digital wardrobe (LocalStorage). Isolated per personId.
 */
export function useWardrobe(personId: PersonId) {
  const [epoch, setEpoch] = useState(0);

  const catalog = useSyncExternalStore(
    (onChange) => subscribeWardrobe(personId, onChange),
    () => {
      void epoch;
      return readWardrobe(personId);
    },
    () => emptyWardrobeCatalog(personId),
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
      setEpoch((e) => e + 1);
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
      const current = readWardrobe(personId);
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
    [personId, persist],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      const current = readWardrobe(personId);
      persist({
        personId,
        items: current.items.filter((i) => i.id !== itemId),
        updatedAt: new Date().toISOString(),
      });
    },
    [personId, persist],
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
