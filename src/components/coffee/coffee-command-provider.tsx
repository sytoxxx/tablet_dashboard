"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
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

export function CoffeeCommandProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<CoffeeCommandData>(emptyCoffeeCommandData);

  useEffect(() => {
    setData(loadCoffeeCommandData());
    setReady(true);
  }, []);

  const persist = useCallback((next: CoffeeCommandData) => {
    setData(next);
    saveCoffeeCommandData(next);
  }, []);

  const addBean = useCallback(
    (input: Omit<CoffeeBean, "id" | "addedAt"> & { id?: string; addedAt?: string }) => {
      const bean: CoffeeBean = {
        ...input,
        id: input.id ?? createCoffeeId("bean"),
        addedAt: input.addedAt ?? new Date().toISOString(),
        name: input.name.trim(),
      };
      persist({
        ...data,
        beans: [bean, ...data.beans],
        activeBeanId: data.activeBeanId ?? bean.id,
      });
      return bean;
    },
    [data, persist],
  );

  const updateBean = useCallback(
    (id: string, patch: Partial<CoffeeBean>) => {
      persist({
        ...data,
        beans: data.beans.map((b) => (b.id === id ? { ...b, ...patch, id: b.id } : b)),
      });
    },
    [data, persist],
  );

  const removeBean = useCallback(
    (id: string) => {
      persist({
        ...data,
        beans: data.beans.filter((b) => b.id !== id),
        activeBeanId: data.activeBeanId === id ? null : data.activeBeanId,
      });
    },
    [data, persist],
  );

  const setActiveBeanId = useCallback(
    (id: string | null) => {
      persist({ ...data, activeBeanId: id });
    },
    [data, persist],
  );

  const addBrew = useCallback(
    (input: Omit<CoffeeBrew, "id"> & { id?: string }) => {
      const brew: CoffeeBrew = {
        ...input,
        id: input.id ?? createCoffeeId("brew"),
      };
      const nextActive =
        brew.beanId && data.beans.some((b) => b.id === brew.beanId)
          ? brew.beanId
          : data.activeBeanId;
      persist({
        ...data,
        brews: [brew, ...data.brews],
        activeBeanId: nextActive,
      });
      return brew;
    },
    [data, persist],
  );

  const removeBrew = useCallback(
    (id: string) => {
      persist({ ...data, brews: data.brews.filter((b) => b.id !== id) });
    },
    [data, persist],
  );

  const replaceAll = useCallback(
    (next: CoffeeCommandData) => {
      persist(next);
    },
    [persist],
  );

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
