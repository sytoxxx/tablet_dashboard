import { describe, expect, it } from "vitest";
import { guidedStepsForDrink } from "@/lib/coffee/guided-steps";
import { recommendBeanForMethod } from "@/lib/coffee/recommendations";
import type { CoffeeDrink } from "@/lib/types";
import type { CoffeeBean, CoffeeBrew } from "@/lib/coffee/types";

const espresso: CoffeeDrink = {
  id: "espresso",
  name: "Espresso",
  prepNotes: "Kurz",
  amounts: "18g",
  steps: [
    "Maschine aufheizen, Tasse vorwärmen",
    "18 g mahlen und tampen",
    "Extraktion starten (~28 Sek.)",
    "Sofort servieren",
  ],
  timerSeconds: 28,
};

function brew(partial: Partial<CoffeeBrew> & Pick<CoffeeBrew, "id" | "brewedAt">): CoffeeBrew {
  return {
    personId: "levi",
    beanId: "b1",
    method: "espresso",
    durationSeconds: 30,
    ...partial,
  };
}

describe("guidedStepsForDrink", () => {
  it("returns [] when the drink has no configured steps", () => {
    expect(guidedStepsForDrink({ ...espresso, steps: [] })).toEqual([]);
  });

  it("derives steps from the drink's real steps, tagging grind and machine-button", () => {
    const steps = guidedStepsForDrink(espresso);
    expect(steps).toHaveLength(4);
    expect(steps[1]?.kind).toBe("grind");
    expect(steps[2]?.kind).toBe("machine-button");
    expect(steps[0]?.kind).toBe("generic");
    expect(steps[3]?.kind).toBe("generic");
    expect(steps[1]?.description).toBe("18 g mahlen und tampen");
  });
});

describe("recommendBeanForMethod", () => {
  const beans: CoffeeBean[] = [
    { id: "b1", name: "Ethiopia", addedAt: "2026-09-01T00:00:00.000Z" },
    { id: "b2", name: "Brazil", addedAt: "2026-09-01T00:00:00.000Z" },
  ];

  it("returns null without matching brew history", () => {
    expect(recommendBeanForMethod(beans, [], "espresso")).toBeNull();
  });

  it("recommends the most-used bean for that method only", () => {
    const brews = [
      brew({ id: "1", brewedAt: "2026-09-15T10:00:00.000Z", beanId: "b1", method: "espresso" }),
      brew({ id: "2", brewedAt: "2026-09-15T11:00:00.000Z", beanId: "b1", method: "espresso" }),
      brew({ id: "3", brewedAt: "2026-09-15T12:00:00.000Z", beanId: "b2", method: "espresso" }),
      brew({ id: "4", brewedAt: "2026-09-15T13:00:00.000Z", beanId: "b2", method: "cappuccino" }),
    ];
    expect(recommendBeanForMethod(beans, brews, "espresso")?.id).toBe("b1");
    expect(recommendBeanForMethod(beans, brews, "cappuccino")?.id).toBe("b2");
    expect(recommendBeanForMethod(beans, brews, "latte")).toBeNull();
  });
});
