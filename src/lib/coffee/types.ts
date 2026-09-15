import type { PersonId } from "@/lib/types";

/** Shared household beans — missing fields stay empty / undefined. */
export type CoffeeBean = {
  id: string;
  name: string;
  roaster?: string;
  origin?: string;
  roast?: string;
  notes?: string;
  /** Optional remaining grams; omit or null when unknown. */
  remainingGrams?: number | null;
  addedAt: string;
};

export type CoffeeBrewMethod =
  | "espresso"
  | "cappuccino"
  | "latte"
  | "filter"
  | "v60"
  | "aeropress"
  | "other";

/**
 * Recipe / method guidance for the brew flow.
 * Optimal times only when known from drink recipe or clearly labeled generic.
 */
export type CoffeeRecipe = {
  id: string;
  name: string;
  method: CoffeeBrewMethod;
  optimalSecondsMin?: number;
  optimalSecondsMax?: number;
  /** How the optimal range was obtained — never invent as fact. */
  optimalSource: "recipe" | "generic_default" | "none";
  steps?: string[];
  amounts?: string;
  notes?: string;
};

/** One saved brew session — feeds stats / history / recommendations. */
export type CoffeeBrew = {
  id: string;
  personId: PersonId;
  beanId: string | null;
  method: CoffeeBrewMethod;
  recipeId?: string | null;
  durationSeconds: number;
  brewedAt: string;
  rating?: number | null;
  note?: string;
};

export type CoffeeCommandData = {
  version: 1;
  beans: CoffeeBean[];
  brews: CoffeeBrew[];
  /** Currently preferred / last-used bean for the household. */
  activeBeanId: string | null;
};

export type BrewTimeVerdict = "short" | "ok" | "long" | "unknown";

export type CoffeePeriodStats = {
  total: number;
  byPerson: Partial<Record<PersonId, number>>;
  byBean: Record<string, number>;
  byMethod: Partial<Record<CoffeeBrewMethod, number>>;
  avgDurationSeconds: number | null;
  avgRating: number | null;
  mostDrunkBeanId: string | null;
};

export const COFFEE_METHOD_LABELS: Record<CoffeeBrewMethod, string> = {
  espresso: "Espresso",
  cappuccino: "Cappuccino",
  latte: "Latte",
  filter: "Filter",
  v60: "V60",
  aeropress: "AeroPress",
  other: "Sonstiges",
};

export const COFFEE_METHODS: CoffeeBrewMethod[] = [
  "espresso",
  "cappuccino",
  "latte",
  "filter",
  "v60",
  "aeropress",
  "other",
];
