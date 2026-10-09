import { describe, expect, it } from "vitest";
import {
  buildGuideFlow,
  completionFor,
  DRINK_CARDS,
  isCompleteSelection,
  needsMethodChoice,
  profileFor,
  routeKeyFor,
} from "@/lib/coffee/guide/flow";
import { GUIDE_PARTS, IMAGE_SLOTS } from "@/lib/coffee/guide/parts";
import type { GuideSelection } from "@/lib/coffee/guide/types";

const SELECTIONS: GuideSelection[] = [
  { drink: "espresso" },
  { drink: "verlaengerter", method: "auto" },
  { drink: "verlaengerter", method: "manual" },
  { drink: "cappuccino" },
  { drink: "latte" },
];

const ids = (sel: GuideSelection) => buildGuideFlow(sel).map((s) => s.id);

describe("coffee guide flow", () => {
  it("offers the four drinks from the brief", () => {
    expect(DRINK_CARDS.map((c) => c.name)).toEqual([
      "Espresso",
      "Verlängerter",
      "Cappuccino",
      "Caffè Latte",
    ]);
  });

  it("only the Verlängerter asks for a method", () => {
    expect(needsMethodChoice("verlaengerter")).toBe(true);
    expect(needsMethodChoice("espresso")).toBe(false);
    expect(isCompleteSelection({ drink: "verlaengerter" })).toBe(false);
    expect(isCompleteSelection({ drink: "verlaengerter", method: "auto" })).toBe(true);
    expect(isCompleteSelection({ drink: "latte" })).toBe(true);
  });

  it("maps selections to routes and profiles", () => {
    expect(routeKeyFor({ drink: "verlaengerter", method: "auto" })).toBe("verlaengerter-auto");
    expect(routeKeyFor({ drink: "verlaengerter", method: "manual" })).toBe("verlaengerter-manuell");
    expect(profileFor({ drink: "verlaengerter", method: "auto" })).toBe("americano");
    expect(profileFor({ drink: "verlaengerter", method: "manual" })).toBe("espresso");
    expect(profileFor({ drink: "cappuccino" })).toBe("espresso");
  });

  it.each(SELECTIONS)("flow %o has unique step ids and valid references", (sel) => {
    const steps = buildGuideFlow(sel);
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
    for (const step of steps) {
      expect(IMAGE_SLOTS[step.image], `${step.id} image`).toBeDefined();
      for (const part of step.parts) expect(GUIDE_PARTS[part], `${step.id} part`).toBeDefined();
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });

  it("shares one common preparation instead of duplicating it per drink", () => {
    const base = buildGuideFlow({ drink: "espresso" });
    const commonLen = base.length - 2; // cup + brew are drink-specific
    for (const sel of SELECTIONS.filter((s) => profileFor(s) === "espresso")) {
      expect(buildGuideFlow(sel).slice(0, commonLen)).toEqual(base.slice(0, commonLen));
    }
  });

  it("follows the verified order for the espresso preparation", () => {
    expect(ids({ drink: "espresso" })).toEqual([
      "basket",
      "funnel",
      "cradle",
      "select",
      "grind-match",
      "grind-start",
      "remove",
      "wdt",
      "tamp",
      "unfunnel",
      "lock",
      "cup",
      "brew",
    ]);
  });

  it("includes the optional WDT step exactly once for espresso-based drinks", () => {
    for (const sel of SELECTIONS.filter((s) => profileFor(s) === "espresso")) {
      const wdt = buildGuideFlow(sel).filter((s) => s.kind === "wdt");
      expect(wdt).toHaveLength(1);
    }
  });

  it("automatic Verlängerter is an Americano: same preparation, AMERICANO on the dial", () => {
    const steps = buildGuideFlow({ drink: "verlaengerter", method: "auto" });
    expect(steps.map((s) => s.id)).toEqual(ids({ drink: "espresso" }));
    const select = steps.find((s) => s.id === "select")!;
    expect(select.image).toBe("select-americano");
    expect(select.body).toContain("AMERICANO");
    expect(steps.find((s) => s.id === "basket")!.image).toBe("basket-double");
    expect(steps.some((s) => s.kind === "wdt")).toBe(true);
  });

  it("manual Verlängerter = espresso, then hot water from the machine's HOT WATER button", () => {
    const steps = buildGuideFlow({ drink: "verlaengerter", method: "manual" });
    expect(steps.slice(-3).map((s) => s.id)).toEqual(["brew", "hot-water-select", "hot-water-start"]);
    const [press, start] = steps.slice(-2);
    expect(press.body).toContain("HOT WATER");
    expect(start.body).toContain("START BREW");
    expect(start.body).toContain("Temperatur");
    expect(start.note).toContain("200 ml");
    expect(steps.some((s) => s.id === "tamp")).toBe(true);
  });

  it("the ES601EU has no kettle step, no Classic/Luxe step and Americano only on its own route", () => {
    for (const sel of SELECTIONS) {
      for (const step of buildGuideFlow(sel)) {
        const text = `${step.title} ${step.body} ${step.note ?? ""}`;
        expect(text, `${sel.drink}/${step.id}`).not.toMatch(/wasserkocher|luxe-sieb|classic/i);
        if (!(sel.drink === "verlaengerter" && sel.method === "auto")) {
          expect(text, `${sel.drink}/${step.id}`).not.toMatch(/americano/i);
        }
      }
    }
  });

  it("treats the machine's RECOMMENDED display as authoritative and hardcodes no grind value", () => {
    const grind = buildGuideFlow({ drink: "espresso" }).find((s) => s.kind === "grind")!;
    expect(grind.body).toContain("RECOMMENDED");
    expect(grind.body).toContain("CURRENT");
    expect(grind.body).not.toMatch(/\d/);
    expect(grind.note ?? "").toContain("Empfehlung");
    const numbers = (grind.note ?? "").match(/\d+/g) ?? [];
    // Only the documented scale ends (1 finest, 25 coarsest) may appear.
    expect(numbers.every((n) => n === "1" || n === "25")).toBe(true);
  });

  it("every Ninja-procedure step cites a source (WDT is the household's own accessory)", () => {
    for (const sel of SELECTIONS) {
      for (const step of buildGuideFlow(sel)) {
        if (step.kind === "wdt") continue;
        expect(step.sources.length, step.id).toBeGreaterThan(0);
      }
    }
  });

  it("milk drinks add the milk steps after the espresso, one action per step", () => {
    const tail = ids({ drink: "latte" }).slice(13);
    expect(tail).toEqual(["milk-jug", "jug-place", "froth-select", "froth-start", "pour-milk", "wand-clean"]);
    expect(ids({ drink: "cappuccino" }).slice(13)).toEqual(tail);
  });

  it("only Cappuccino and Latte get the milk workflow", () => {
    const MILK_IDS = ["milk-jug", "jug-place", "froth-select", "froth-start", "pour-milk", "wand-clean"];
    for (const sel of SELECTIONS) {
      const flow = ids(sel);
      const hasMilk = MILK_IDS.some((id) => flow.includes(id));
      expect(hasMilk, JSON.stringify(sel)).toBe(sel.drink === "cappuccino" || sel.drink === "latte");
      if (hasMilk) expect(MILK_IDS.every((id) => flow.includes(id))).toBe(true);
    }
  });

  it("Cappuccino and Latte get different milk amount, froth style and cup (official recipes)", () => {
    const pick = (sel: GuideSelection, id: string) => buildGuideFlow(sel).find((s) => s.id === id)!;
    const cap = { drink: "cappuccino" } as const;
    const lat = { drink: "latte" } as const;
    expect(pick(cap, "milk-jug").body).toContain("„cappuccino“");
    expect(pick(lat, "milk-jug").body).toContain("„latte“");
    expect(pick(cap, "milk-jug").note).toContain("5 oz");
    expect(pick(lat, "milk-jug").note).toContain("8 oz");
    expect(pick(cap, "froth-select").body).toContain("THICK FROTH");
    expect(pick(lat, "froth-select").body).toContain("THIN FROTH");
    expect(pick(cap, "cup").note).not.toEqual(pick(lat, "cup").note);
    // both still keep the owner's-guide safety rule
    for (const sel of [cap, lat]) {
      expect(pick(sel, "milk-jug").note).toContain("Nicht höher füllen");
      expect(pick(sel, "froth-start").note).toContain("Nie direkt in den Espresso");
    }
  });

  it("milk steps cite the owner's guide and an official recipe", () => {
    for (const drink of ["cappuccino", "latte"] as const) {
      const jug = buildGuideFlow({ drink }).find((s) => s.id === "milk-jug")!;
      expect(jug.sources.some((s) => s.id === "owners-guide-es600eu")).toBe(true);
      expect(jug.sources.some((s) => s.id === `recipe-${drink}`)).toBe(true);
    }
  });

  it("milk drinks differ in froth style, matching the owner's guide", () => {
    const froth = (sel: GuideSelection) =>
      buildGuideFlow(sel).find((s) => s.id === "froth-select")!;
    expect(froth({ drink: "cappuccino" }).title).toContain("Thick");
    expect(froth({ drink: "latte" }).title).toContain("Thin");
  });

  it("ends every flow with a completion message", () => {
    expect(completionFor({ drink: "espresso" }).headline).toBe("Dein Espresso ist fertig ☕");
    expect(completionFor({ drink: "cappuccino" }).headline).toBe("Dein Cappuccino ist fertig ☕");
    expect(completionFor({ drink: "latte" }).headline).toBe("Dein Caffè Latte ist fertig ☕");
    expect(completionFor({ drink: "verlaengerter", method: "auto" }).headline).toBe(
      "Dein Americano ist fertig ☕",
    );
    expect(completionFor({ drink: "verlaengerter", method: "manual" }).headline).toBe(
      "Dein Verlängerter ist fertig ☕",
    );
  });

  it("image slots have unique file names", () => {
    const files = Object.values(IMAGE_SLOTS).map((s) => s.file);
    expect(new Set(files).size).toBe(files.length);
  });

  it("steps that rest on something the manual does not state are marked as unverified — and only those", () => {
    const flagged = (sel: GuideSelection) =>
      buildGuideFlow(sel).filter((st) => st.unverified).map((st) => st.id);
    expect(flagged({ drink: "verlaengerter", method: "auto" })).toEqual(["select", "tamp"]);
    for (const sel of [
      { drink: "espresso" },
      { drink: "verlaengerter", method: "manual" },
      { drink: "cappuccino" },
      { drink: "latte" },
    ] as const) {
      expect(flagged(sel)).toEqual([]);
    }
  });
});
