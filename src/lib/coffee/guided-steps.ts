import type { CoffeeDrink } from "@/lib/types";

/**
 * "grind" and "machine-button" steps get a dynamic sub-line in the wizard
 * (bean-specific grind setting / the real configured machine button label).
 */
export type CoffeeGuidedStepKind = "generic" | "grind" | "machine-button";

export type CoffeeGuidedStep = {
  title: string;
  description: string;
  kind: CoffeeGuidedStepKind;
  /** Real photo URL when one has been uploaded — otherwise a neutral placeholder renders. */
  image?: string | null;
};

function stepKindFor(text: string): CoffeeGuidedStepKind {
  const t = text.toLowerCase();
  if (/mahl/.test(t)) return "grind";
  if (/(extrakt|taste|start)/.test(t)) return "machine-button";
  return "generic";
}

/**
 * Guided wizard steps for a drink — from the drink's own real prep steps
 * (admin-configured in Einstellungen → Kaffee), never invented here.
 * Returns [] when the drink has no steps configured yet.
 */
export function guidedStepsForDrink(drink: CoffeeDrink): CoffeeGuidedStep[] {
  if (!drink.steps?.length) return [];
  return drink.steps.map((description, i) => ({
    title: `Schritt ${i + 1}`,
    description,
    kind: stepKindFor(description),
    image: null,
  }));
}
