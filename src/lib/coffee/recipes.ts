import type { CoffeeDrink } from "@/lib/types";
import type { CoffeeBrewMethod, CoffeeRecipe } from "@/lib/coffee/types";
import { COFFEE_METHOD_LABELS } from "@/lib/coffee/types";

/** Generic ranges — clearly labeled, not presented as measured facts. */
const GENERIC_OPTIMAL: Partial<
  Record<CoffeeBrewMethod, { min: number; max: number }>
> = {
  filter: { min: 150, max: 240 },
  v60: { min: 150, max: 210 },
  aeropress: { min: 90, max: 150 },
  other: { min: 60, max: 180 },
};

function drinkMethod(drink: CoffeeDrink): CoffeeBrewMethod {
  if (drink.id === "espresso" || drink.id === "cappuccino" || drink.id === "latte") {
    return drink.id;
  }
  return "other";
}

/** Map existing AppData drinks to recipes with optimal range from timerSeconds. */
export function recipesFromDrinks(drinks: CoffeeDrink[]): CoffeeRecipe[] {
  return drinks.map((drink) => {
    const target = Math.max(5, drink.timerSeconds);
    const slack = Math.max(3, Math.round(target * 0.1));
    return {
      id: drink.id,
      name: drink.name,
      method: drinkMethod(drink),
      optimalSecondsMin: Math.max(5, target - slack),
      optimalSecondsMax: target + slack,
      optimalSource: "recipe" as const,
      steps: drink.steps,
      amounts: drink.amounts,
      notes: drink.prepNotes,
    };
  });
}

export function recipeForMethod(
  method: CoffeeBrewMethod,
  drinks: CoffeeDrink[],
): CoffeeRecipe {
  const fromDrink = recipesFromDrinks(drinks).find((r) => r.method === method);
  if (fromDrink) return fromDrink;

  const generic = GENERIC_OPTIMAL[method];
  if (generic) {
    return {
      id: `generic-${method}`,
      name: COFFEE_METHOD_LABELS[method],
      method,
      optimalSecondsMin: generic.min,
      optimalSecondsMax: generic.max,
      optimalSource: "generic_default",
      notes: "Allgemeiner Richtwert — nicht aus einem hinterlegten Rezept.",
    };
  }

  return {
    id: `none-${method}`,
    name: COFFEE_METHOD_LABELS[method],
    method,
    optimalSource: "none",
  };
}

export function describeOptimal(recipe: CoffeeRecipe): {
  label: string;
  detail: string | null;
} {
  if (
    recipe.optimalSource === "none" ||
    recipe.optimalSecondsMin == null ||
    recipe.optimalSecondsMax == null
  ) {
    return {
      label: "Keine optimale Zeit hinterlegt",
      detail: null,
    };
  }

  const min = formatMmSs(recipe.optimalSecondsMin);
  const max = formatMmSs(recipe.optimalSecondsMax);
  if (recipe.optimalSource === "recipe") {
    return {
      label: `Optimal: ${min}–${max}`,
      detail: "Aus dem hinterlegten Rezept.",
    };
  }
  return {
    label: `Richtwert: ${min}–${max}`,
    detail: "Allgemeiner Richtwert — nicht aus einem hinterlegten Rezept.",
  };
}

function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function verdictForDuration(
  durationSeconds: number,
  recipe: CoffeeRecipe,
): "short" | "ok" | "long" | "unknown" {
  if (
    recipe.optimalSource === "none" ||
    recipe.optimalSecondsMin == null ||
    recipe.optimalSecondsMax == null
  ) {
    return "unknown";
  }
  if (durationSeconds < recipe.optimalSecondsMin) return "short";
  if (durationSeconds > recipe.optimalSecondsMax) return "long";
  return "ok";
}
