import { describe, expect, it } from "vitest";
import {
  computePeriodStats,
  filterBrewsSince,
  statsForToday,
} from "@/lib/coffee/stats";
import type { CoffeeBrew } from "@/lib/coffee/types";
import { normalizeCoffeeCommandData } from "@/lib/coffee/store";
import { recipeForMethod, verdictForDuration } from "@/lib/coffee/recipes";
import { buildRecommendations } from "@/lib/coffee/recommendations";
import { validateBeanScanResult, emptyBeanScanDraft } from "@/lib/coffee/scan";
import type { CoffeeDrink } from "@/lib/types";

const drinks: CoffeeDrink[] = [
  {
    id: "espresso",
    name: "Espresso",
    prepNotes: "Kurz",
    amounts: "18g",
    steps: ["Mahlen"],
    timerSeconds: 28,
  },
];

function brew(partial: Partial<CoffeeBrew> & Pick<CoffeeBrew, "id" | "brewedAt">): CoffeeBrew {
  return {
    personId: "levi",
    beanId: "b1",
    method: "espresso",
    durationSeconds: 30,
    ...partial,
  };
}

describe("coffee stats", () => {
  it("counts today brews and most-drunk bean", () => {
    const now = new Date();
    const earlierToday = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const alsoToday = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const yesterday = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
    const brews = [
      brew({ id: "1", brewedAt: earlierToday, beanId: "b1" }),
      brew({
        id: "2",
        brewedAt: alsoToday,
        beanId: "b1",
        personId: "birgit",
      }),
      brew({ id: "3", brewedAt: yesterday, beanId: "b2" }),
    ];
    const today = statsForToday(brews, now);
    expect(today.total).toBe(2);
    expect(today.byPerson.levi).toBe(1);
    expect(today.byPerson.birgit).toBe(1);
    expect(today.mostDrunkBeanId).toBe("b1");
  });

  it("filterBrewsSince respects window", () => {
    const end = new Date("2026-09-15T12:00:00.000Z");
    const start = new Date("2026-09-14T00:00:00.000Z");
    const brews = [
      brew({ id: "1", brewedAt: "2026-09-15T10:00:00.000Z" }),
      brew({ id: "2", brewedAt: "2026-09-10T10:00:00.000Z" }),
    ];
    const filtered = filterBrewsSince(brews, start, end);
    expect(filtered).toHaveLength(1);
  });

  it("computePeriodStats averages ratings", () => {
    const stats = computePeriodStats([
      brew({ id: "1", brewedAt: "2026-09-15T10:00:00.000Z", rating: 4 }),
      brew({ id: "2", brewedAt: "2026-09-15T11:00:00.000Z", rating: 5 }),
    ]);
    expect(stats.avgRating).toBe(4.5);
  });
});

describe("coffee recipes / stopwatch verdict", () => {
  it("uses recipe optimal from drink timer", () => {
    const recipe = recipeForMethod("espresso", drinks);
    expect(recipe.optimalSource).toBe("recipe");
    expect(verdictForDuration(28, recipe)).toBe("ok");
    expect(verdictForDuration(5, recipe)).toBe("short");
    expect(verdictForDuration(90, recipe)).toBe("long");
  });

  it("unknown when no optimal", () => {
    const recipe = recipeForMethod("other", []);
    // other has generic_default
    expect(recipe.optimalSource).toBe("generic_default");
    const none = recipeForMethod("espresso", []);
    // espresso without drink falls through — no generic for espresso in map
    expect(none.optimalSource).toBe("none");
    expect(verdictForDuration(30, none)).toBe("unknown");
  });
});

describe("coffee store normalize", () => {
  it("drops invalid brews and beans", () => {
    const data = normalizeCoffeeCommandData({
      version: 1,
      beans: [{ id: "b1", name: "Ethiopia" }, { id: "", name: "" }],
      brews: [
        {
          id: "br1",
          personId: "levi",
          beanId: "b1",
          method: "espresso",
          durationSeconds: 30,
          brewedAt: "2026-09-15T10:00:00.000Z",
        },
        { id: "bad", personId: "nope" },
      ],
      activeBeanId: "missing",
    });
    expect(data.beans).toHaveLength(1);
    expect(data.brews).toHaveLength(1);
    expect(data.activeBeanId).toBeNull();
  });
});

describe("recommendations", () => {
  it("returns empty without data", () => {
    expect(buildRecommendations([], [])).toEqual([]);
  });

  it("suggests from real brews only", () => {
    const items = buildRecommendations(
      [{ id: "b1", name: "Testbohne", addedAt: "2026-09-01T00:00:00.000Z" }],
      [
        brew({ id: "1", brewedAt: "2026-09-15T10:00:00.000Z", rating: 5, beanId: "b1" }),
        brew({ id: "2", brewedAt: "2026-09-15T11:00:00.000Z", beanId: "b1" }),
        brew({ id: "3", brewedAt: "2026-09-15T12:00:00.000Z", beanId: "b1" }),
      ],
    );
    expect(items.some((i) => i.id === "most-drunk-bean")).toBe(true);
    expect(items.some((i) => i.id === "high-rated")).toBe(true);
  });
});

describe("bean scan validate", () => {
  it("marks empty fields as unrecognized", () => {
    const validated = validateBeanScanResult({
      source: "mock",
      confidence: 0,
      warnings: ["mock"],
      draft: emptyBeanScanDraft(),
    });
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      expect(validated.result.draft.name.recognized).toBe(false);
      expect(validated.result.draft.name.value).toBe("");
    }
  });
});
