"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { CoffeeBean, CoffeeBrew, CoffeeCommandData } from "@/lib/coffee/types";
import {
  emptyCoffeeCommandData,
  loadCoffeeCommandData,
  saveCoffeeCommandData,
} from "@/lib/coffee/store";
import { createCoffeeId } from "@/lib/coffee/id";

type CoffeeCommandContextValue = {
  ready: boolean;
  data: CoffeeCommandData;
  addBean: (bean: Omit<CoffeeBean, "id" | "addedAt"> & { id?: string; addedAt?: string }) => CoffeeBean;
  updateBean: (id: string, patch: Partial<CoffeeBean>) => void;
  removeBean: (id: string) => void;
  setActiveBeanId: (id: string | null) => void;
  addBrew: (brew: Omit<CoffeeBrew, "id"> & { id?: string }) => CoffeeBrew;
  removeBrew: (id: string) => void;
  replaceAll: (next: CoffeeCommandData) => void;
};

const CoffeeCommandContext = createContext<CoffeeCommandContextValue | null>(null);

/**
 * Apply a mutation from the latest persisted snapshot.
 * Functional updates avoid stale-closure overwrites when callers chain
 * addBrew + setActiveBeanId (or double-tap Speichern) in one turn.
 */
function applyAndPersist(
  setData: Dispatch<SetStateAction<CoffeeCommandData>>,
  updater: (prev: CoffeeCommandData) => CoffeeCommandData,
): void {
  setData((prev) => {
    const committed = updater(prev);
    saveCoffeeCommandData(committed);
    return committed;
  });
}

export function CoffeeCommandProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<CoffeeCommandData>(emptyCoffeeCommandData);

  useEffect(() => {
    // Hydrate after mount from LocalStorage (external store). Defer setState so we
    // don't cascade a sync render inside the effect body (react-hooks/set-state-in-effect).
    const id = window.setTimeout(() => {
      setData(loadCoffeeCommandData());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const addBean = useCallback(
    (input: Omit<CoffeeBean, "id" | "addedAt"> & { id?: string; addedAt?: string }) => {
      const bean: CoffeeBean = {
        ...input,
        id: input.id ?? createCoffeeId("bean"),
        addedAt: input.addedAt ?? new Date().toISOString(),
        name: input.name.trim(),
      };
      applyAndPersist(setData, (prev) => ({
        ...prev,
        beans: [bean, ...prev.beans],
        activeBeanId: prev.activeBeanId ?? bean.id,
      }));
      return bean;
    },
    [],
  );

  const updateBean = useCallback((id: string, patch: Partial<CoffeeBean>) => {
    applyAndPersist(setData, (prev) => ({
      ...prev,
      beans: prev.beans.map((b) => (b.id === id ? { ...b, ...patch, id: b.id } : b)),
    }));
  }, []);

  const removeBean = useCallback((id: string) => {
    applyAndPersist(setData, (prev) => ({
      ...prev,
      beans: prev.beans.filter((b) => b.id !== id),
      activeBeanId: prev.activeBeanId === id ? null : prev.activeBeanId,
    }));
  }, []);

  const setActiveBeanId = useCallback((id: string | null) => {
    applyAndPersist(setData, (prev) => ({ ...prev, activeBeanId: id }));
  }, []);

  const addBrew = useCallback((input: Omit<CoffeeBrew, "id"> & { id?: string }) => {
    const brew: CoffeeBrew = {
      ...input,
      id: input.id ?? createCoffeeId("brew"),
    };
    applyAndPersist(setData, (prev) => {
      const nextActive =
        brew.beanId && prev.beans.some((b) => b.id === brew.beanId)
          ? brew.beanId
          : prev.activeBeanId;
      return {
        ...prev,
        brews: [brew, ...prev.brews],
        activeBeanId: nextActive,
      };
    });
    return brew;
  }, []);

  const removeBrew = useCallback((id: string) => {
    applyAndPersist(setData, (prev) => ({
      ...prev,
      brews: prev.brews.filter((b) => b.id !== id),
    }));
  }, []);

  const replaceAll = useCallback((next: CoffeeCommandData) => {
    applyAndPersist(setData, () => next);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      data,
      addBean,
      updateBean,
      removeBean,
      setActiveBeanId,
      addBrew,
      removeBrew,
      replaceAll,
    }),
    [
      ready,
      data,
      addBean,
      updateBean,
      removeBean,
      setActiveBeanId,
      addBrew,
      removeBrew,
      replaceAll,
    ],
  );

  return (
    <CoffeeCommandContext.Provider value={value}>{children}</CoffeeCommandContext.Provider>
  );
}

export function useCoffeeCommand(): CoffeeCommandContextValue {
  const ctx = useContext(CoffeeCommandContext);
  if (!ctx) {
    throw new Error("useCoffeeCommand must be used within CoffeeCommandProvider");
  }
  return ctx;
}
