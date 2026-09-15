import type { AppData, CoffeeDrink, PersonId, PersonProfile } from "@/lib/types";
import { createDefaultRepository } from "@/data/repository";
import { seedAppData } from "@/data/seed";

let data: AppData = structuredClone(seedAppData);
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  data = createDefaultRepository().load();
  hydrated = true;
}

export function subscribeAppStore(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAppSnapshot(): AppData {
  return data;
}

export function getAppServerSnapshot(): AppData {
  return seedAppData;
}

export function isAppHydrated() {
  return hydrated;
}

function persist(next: AppData) {
  data = next;
  if (typeof window !== "undefined") {
    createDefaultRepository().save(next);
  }
  emit();
}

export function updatePersonInStore(
  id: PersonId,
  updater: (person: PersonProfile) => PersonProfile,
) {
  const nextPersons = data.persons.map((p) =>
    p.id === id ? updater(structuredClone(p)) : p,
  );
  persist({ ...data, persons: nextPersons });
}

export function updateCoffeeInStore(drinks: CoffeeDrink[]) {
  persist({ ...data, coffeeDrinks: drinks });
}

export function replaceAppData(next: AppData) {
  persist(next);
}

export function resetAppStore() {
  createDefaultRepository().clear();
  persist(structuredClone(seedAppData));
}
