"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AppData, CoffeeDrink, PersonId, PersonProfile } from "@/lib/types";
import {
  getAppServerSnapshot,
  getAppSnapshot,
  replaceAppData,
  resetAppStore,
  subscribeAppStore,
  updateCoffeeInStore,
  updatePersonInStore,
} from "@/data/app-store";

type DataContextValue = {
  data: AppData;
  getPerson: (id: string) => PersonProfile | undefined;
  updatePerson: (id: PersonId, updater: (person: PersonProfile) => PersonProfile) => void;
  updateCoffeeDrinks: (drinks: CoffeeDrink[]) => void;
  replaceData: (data: AppData) => void;
  resetToSeed: () => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const data = useSyncExternalStore(
    subscribeAppStore,
    getAppSnapshot,
    getAppServerSnapshot,
  );

  const getPerson = useCallback(
    (id: string) => data.persons.find((p) => p.id === id),
    [data.persons],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      getPerson,
      updatePerson: updatePersonInStore,
      updateCoffeeDrinks: updateCoffeeInStore,
      replaceData: replaceAppData,
      resetToSeed: resetAppStore,
    }),
    [data, getPerson],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useAppData must be used within DataProvider");
  return ctx;
}

export function isPersonId(id: string): id is PersonId {
  return id === "levi" || id === "birgit" || id === "heidi";
}
