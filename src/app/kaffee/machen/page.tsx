"use client";

import { CoffeeShell } from "@/components/coffee/coffee-shell";
import { CoffeeMakeFlow } from "@/components/coffee/coffee-make-flow";

export default function KaffeeMachenPage() {
  return (
    <main>
      <CoffeeShell
        title="Kaffee machen"
        subtitle="Getränk wählen · Bohne · Schritt für Schritt."
      >
        <CoffeeMakeFlow />
      </CoffeeShell>
    </main>
  );
}
