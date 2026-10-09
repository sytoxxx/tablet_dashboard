import { describe, expect, it } from "vitest";
import { brewMethodFor, brewNoteFor } from "@/lib/coffee/guide/history";
import { normalizeCoffeeCommandData } from "@/lib/coffee/store";

describe("guide → brew history", () => {
  it("maps drinks to existing history methods", () => {
    expect(brewMethodFor({ drink: "espresso" })).toBe("espresso");
    expect(brewMethodFor({ drink: "cappuccino" })).toBe("cappuccino");
    expect(brewMethodFor({ drink: "latte" })).toBe("latte");
    expect(brewMethodFor({ drink: "verlaengerter", method: "manual" })).toBe("other");
  });

  it("keeps the Verlängerter recognisable in the note, with grind and WDT only when given", () => {
    expect(
      brewNoteFor({ drink: "verlaengerter", method: "manual" }, { grind: " 9 ", wdt: "used" }),
    ).toBe("Verlängerter (manuell) · Mahlgrad 9 · mit WDT");
    expect(brewNoteFor({ drink: "espresso" }, { wdt: "skipped" })).toBe("Espresso");
    expect(brewNoteFor({ drink: "latte" }, { grind: "  " })).toBe("Caffè Latte");
  });

  it("a saved guide brew survives the existing store sanitizer unchanged", () => {
    const data = normalizeCoffeeCommandData({
      version: 1,
      beans: [],
      activeBeanId: null,
      brews: [
        {
          id: "b1",
          personId: "heidi",
          beanId: null,
          method: brewMethodFor({ drink: "verlaengerter", method: "auto" }),
          durationSeconds: 0,
          brewedAt: "2026-10-06T07:30:00.000Z",
          rating: 4,
          note: brewNoteFor({ drink: "verlaengerter", method: "auto" }, { grind: "11" }),
        },
      ],
    });
    expect(data.brews).toHaveLength(1);
    expect(data.brews[0]).toMatchObject({
      method: "other",
      durationSeconds: 0,
      rating: 4,
      note: "Verlängerter (automatisch) · Mahlgrad 11",
    });
  });
});
