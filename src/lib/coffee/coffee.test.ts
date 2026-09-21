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
    // Anchored at noon so the ±1h / 36h offsets below never cross a midnight
    // boundary regardless of when the suite runs.
    const now = new Date();
    now.setHours(12, 0, 0, 0);
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

  it("returns empty data for corrupt / non-object payloads", () => {
    expect(normalizeCoffeeCommandData(null)).toEqual({
      version: 1,
      beans: [],
      brews: [],
      activeBeanId: null,
    });
    expect(normalizeCoffeeCommandData("not-json-object")).toEqual({
      version: 1,
      beans: [],
      brews: [],
      activeBeanId: null,
    });
    expect(normalizeCoffeeCommandData([])).toEqual({
      version: 1,
      beans: [],
      brews: [],
      activeBeanId: null,
    });
  });

  it("accepts legacy-ish payloads missing version and strips XSS-ish chars", () => {
    const data = normalizeCoffeeCommandData({
      beans: [{ id: "b1", name: "  <script>Yirg</script>  ", roaster: "A<b>B" }],
      brews: [],
      activeBeanId: "b1",
    });
    expect(data.version).toBe(1);
    expect(data.beans[0]?.name).toBe("scriptYirg/script");
    expect(data.beans[0]?.roaster).toBe("AbB");
    expect(data.activeBeanId).toBe("b1");
  });

  it("keeps a trimmed grindSetting and drops an empty one", () => {
    const data = normalizeCoffeeCommandData({
      beans: [
        { id: "b1", name: "Ethiopia", grindSetting: "  10  " },
        { id: "b2", name: "Brazil", grindSetting: "   " },
      ],
      brews: [],
      activeBeanId: null,
    });
    expect(data.beans[0]?.grindSetting).toBe("10");
    expect(data.beans[1]?.grindSetting).toBeUndefined();
  });

  it("rejects brews with unparseable brewedAt", () => {
    const data = normalizeCoffeeCommandData({
      beans: [],
      brews: [
        {
          id: "br1",
          personId: "levi",
          beanId: null,
          method: "espresso",
          durationSeconds: 25,
          brewedAt: "not-a-date",
        },
      ],
      activeBeanId: null,
    });
    expect(data.brews).toHaveLength(0);
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

  it("stays empty for a single unrated brew without known bean stats", () => {
    const items = buildRecommendations([], [
      brew({ id: "1", brewedAt: "2026-09-15T10:00:00.000Z", beanId: null, rating: null }),
    ]);
    expect(items).toEqual([]);
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

  it("rejects non-object scan payloads", () => {
    expect(validateBeanScanResult("nope").ok).toBe(false);
  });
});

describe("period stats edge sizes", () => {
  it("handles zero, one, and many brews", () => {
    expect(computePeriodStats([]).total).toBe(0);
    expect(computePeriodStats([]).avgDurationSeconds).toBeNull();

    const one = computePeriodStats([
      brew({ id: "1", brewedAt: "2026-09-15T10:00:00.000Z", durationSeconds: 28 }),
    ]);
    expect(one.total).toBe(1);
    expect(one.avgDurationSeconds).toBe(28);

    const many = Array.from({ length: 12 }, (_, i) =>
      brew({
        id: `m${i}`,
        brewedAt: `2026-09-15T${String(10 + (i % 10)).padStart(2, "0")}:00:00.000Z`,
        beanId: i % 2 === 0 ? "b1" : "b2",
      }),
    );
    const stats = computePeriodStats(many);
    expect(stats.total).toBe(12);
    expect(stats.mostDrunkBeanId).toBe("b1");
  });
});
