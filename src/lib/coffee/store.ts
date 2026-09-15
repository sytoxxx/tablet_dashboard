/**
 * Coffee Command Center persistence (LocalStorage).
 * Separate from AppData so a later backend can swap this adapter without
 * touching persons / bus / weather.
 */
import type { CoffeeBean, CoffeeBrew, CoffeeCommandData } from "@/lib/coffee/types";

export const COFFEE_COMMAND_STORAGE_KEY = "coffee-morning-command-v1";

export function emptyCoffeeCommandData(): CoffeeCommandData {
  return {
    version: 1,
    beans: [],
    brews: [],
    activeBeanId: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function sanitizeBean(raw: unknown): CoffeeBean | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.slice(0, 64) : "";
  const name = typeof raw.name === "string" ? raw.name.replace(/[<>]/g, "").trim().slice(0, 80) : "";
  if (!id || !name) return null;
  const bean: CoffeeBean = {
    id,
    name,
    addedAt:
      typeof raw.addedAt === "string" && raw.addedAt
        ? raw.addedAt
        : new Date().toISOString(),
  };
  if (typeof raw.roaster === "string" && raw.roaster.trim()) {
    bean.roaster = raw.roaster.replace(/[<>]/g, "").trim().slice(0, 80);
  }
  if (typeof raw.origin === "string" && raw.origin.trim()) {
    bean.origin = raw.origin.replace(/[<>]/g, "").trim().slice(0, 80);
  }
  if (typeof raw.roast === "string" && raw.roast.trim()) {
    bean.roast = raw.roast.replace(/[<>]/g, "").trim().slice(0, 40);
  }
  if (typeof raw.notes === "string" && raw.notes.trim()) {
    bean.notes = raw.notes.replace(/[<>]/g, "").trim().slice(0, 400);
  }
  if (raw.remainingGrams === null) bean.remainingGrams = null;
  else if (typeof raw.remainingGrams === "number" && Number.isFinite(raw.remainingGrams)) {
    bean.remainingGrams = Math.max(0, Math.min(50_000, Math.round(raw.remainingGrams)));
  }
  return bean;
}

const PERSON_IDS = new Set(["levi", "birgit", "heidi"]);
const METHODS = new Set([
  "espresso",
  "cappuccino",
  "latte",
  "filter",
  "v60",
  "aeropress",
  "other",
]);

function sanitizeBrew(raw: unknown): CoffeeBrew | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.slice(0, 64) : "";
  const personId = typeof raw.personId === "string" ? raw.personId : "";
  const method = typeof raw.method === "string" ? raw.method : "";
  const durationSeconds =
    typeof raw.durationSeconds === "number" && Number.isFinite(raw.durationSeconds)
      ? Math.max(0, Math.min(3600, Math.round(raw.durationSeconds)))
      : NaN;
  const brewedAt = typeof raw.brewedAt === "string" ? raw.brewedAt : "";
  if (!id || !PERSON_IDS.has(personId) || !METHODS.has(method) || !brewedAt) return null;
  if (!Number.isFinite(durationSeconds)) return null;

  const brew: CoffeeBrew = {
    id,
    personId: personId as CoffeeBrew["personId"],
    beanId: typeof raw.beanId === "string" ? raw.beanId : null,
    method: method as CoffeeBrew["method"],
    durationSeconds,
    brewedAt,
  };
  if (typeof raw.recipeId === "string") brew.recipeId = raw.recipeId;
  else if (raw.recipeId === null) brew.recipeId = null;
  if (raw.rating === null) brew.rating = null;
  else if (typeof raw.rating === "number" && Number.isFinite(raw.rating)) {
    brew.rating = Math.max(1, Math.min(5, Math.round(raw.rating)));
  }
  if (typeof raw.note === "string" && raw.note.trim()) {
    brew.note = raw.note.replace(/[<>]/g, "").trim().slice(0, 400);
  }
  return brew;
}

export function normalizeCoffeeCommandData(raw: unknown): CoffeeCommandData {
  if (!isRecord(raw)) return emptyCoffeeCommandData();
  const beans = Array.isArray(raw.beans)
    ? raw.beans.map(sanitizeBean).filter((b): b is CoffeeBean => !!b).slice(0, 100)
    : [];
  const brews = Array.isArray(raw.brews)
    ? raw.brews.map(sanitizeBrew).filter((b): b is CoffeeBrew => !!b).slice(0, 500)
    : [];
  let activeBeanId: string | null =
    typeof raw.activeBeanId === "string" ? raw.activeBeanId : null;
  if (activeBeanId && !beans.some((b) => b.id === activeBeanId)) {
    activeBeanId = null;
  }
  return { version: 1, beans, brews, activeBeanId };
}

export function loadCoffeeCommandData(): CoffeeCommandData {
  if (typeof window === "undefined") return emptyCoffeeCommandData();
  try {
    const raw = window.localStorage.getItem(COFFEE_COMMAND_STORAGE_KEY);
    if (!raw) return emptyCoffeeCommandData();
    return normalizeCoffeeCommandData(JSON.parse(raw));
  } catch {
    return emptyCoffeeCommandData();
  }
}

export function saveCoffeeCommandData(data: CoffeeCommandData): void {
  if (typeof window === "undefined") return;
  const cleaned = normalizeCoffeeCommandData(data);
  window.localStorage.setItem(COFFEE_COMMAND_STORAGE_KEY, JSON.stringify(cleaned));
}

export function createMemoryCoffeeCommandStore(initial?: CoffeeCommandData) {
  let data = normalizeCoffeeCommandData(initial ?? emptyCoffeeCommandData());
  return {
    load(): CoffeeCommandData {
      return structuredClone(data);
    },
    save(next: CoffeeCommandData) {
      data = normalizeCoffeeCommandData(next);
    },
  };
}
