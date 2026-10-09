import { drinkName } from "@/lib/coffee/guide/flow";
import type { WdtChoice } from "@/lib/coffee/guide/session";
import type { GuideSelection } from "@/lib/coffee/guide/types";
import type { CoffeeBrewMethod } from "@/lib/coffee/types";

/** Brew-history method for a guide drink. The Verlängerter has no own history method. */
export function brewMethodFor(sel: GuideSelection): CoffeeBrewMethod {
  switch (sel.drink) {
    case "espresso":
    case "cappuccino":
    case "latte":
      return sel.drink;
    case "verlaengerter":
      return "other";
  }
}

/**
 * History note: drink (so "Verlängerter" stays recognisable), the grind value the
 * user actually set on the machine (typed in — never assumed), and WDT use.
 */
export function brewNoteFor(
  sel: GuideSelection,
  opts: { grind?: string; wdt?: WdtChoice },
): string {
  const parts = [drinkName(sel)];
  const grind = opts.grind?.trim();
  if (grind) parts.push(`Mahlgrad ${grind}`);
  if (opts.wdt === "used") parts.push("mit WDT");
  return parts.join(" · ");
}
