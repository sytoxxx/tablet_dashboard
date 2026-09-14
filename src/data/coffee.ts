import type { CoffeeDrink } from "@/lib/types";

export const coffeeDrinks: CoffeeDrink[] = [
  {
    id: "espresso",
    name: "Espresso",
    prepNotes: "Doppelter Schuss, cremig extrahieren. Tasse vorwärmen.",
    amounts: "18 g Kaffee · 36 ml · 1 Tasse",
    timerSeconds: 28,
    personalSettings: "Levi: etwas kürzer · Heidi: Standard",
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    prepNotes: "Espresso + samtiger Milchschaum, 1:1:1. Nicht zu heiß.",
    amounts: "18 g · 120 ml Milch · große Tasse",
    timerSeconds: 45,
    personalSettings: "Schwiegermutter: extra Schaum · Levi: wenig Zucker",
  },
  {
    id: "latte",
    name: "Latte",
    prepNotes: "Espresso unten, viel Milch, dünne Schaumschicht oben.",
    amounts: "18 g · 200 ml Milch · Tall Glas",
    timerSeconds: 55,
    personalSettings: "Heidi: Hafermilch · Levi: normale Milch",
  },
];

export function getCoffeeDrink(id: string): CoffeeDrink | undefined {
  return coffeeDrinks.find((d) => d.id === id);
}
