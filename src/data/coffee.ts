import type { CoffeeDrink } from "@/lib/types";

export const coffeeDrinks: CoffeeDrink[] = [
  {
    id: "espresso",
    name: "Espresso",
    prepNotes: "Doppelter Schuss, cremig extrahieren. Tasse vorwärmen.",
    amounts: "18 g Kaffee · 36 ml · 1 Tasse",
    steps: [
      "Maschine aufheizen, Tasse vorwärmen",
      "18 g mahlen und tampen",
      "Extraktion starten (~28 Sek.)",
      "Sofort servieren",
    ],
    timerSeconds: 28,
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    prepNotes: "Espresso + samtiger Milchschaum, etwa 1:1:1. Nicht zu heiß.",
    amounts: "18 g · 120 ml Milch · große Tasse",
    steps: [
      "Espresso wie gewohnt ziehen",
      "Milch aufschäumen bis samtig",
      "Milch in den Espresso gießen",
      "Schaumkrone formen",
    ],
    timerSeconds: 45,
  },
  {
    id: "latte",
    name: "Latte",
    prepNotes: "Espresso unten, viel Milch, dünne Schaumschicht oben.",
    amounts: "18 g · 200 ml Milch · Tall Glas",
    steps: [
      "Espresso in das Glas",
      "Milch dampfen (viel Volumen)",
      "Milch langsam eingießen",
      "Dünne Schaumschicht oben",
    ],
    timerSeconds: 55,
  },
];

export function getCoffeeDrink(id: string): CoffeeDrink | undefined {
  return coffeeDrinks.find((d) => d.id === id);
}
