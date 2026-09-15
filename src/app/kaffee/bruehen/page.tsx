"use client";

import { CoffeeShell } from "@/components/coffee/coffee-shell";
import { BrewFlow } from "@/components/coffee/brew-flow";

export default function BruehenPage() {
  return (
    <main>
      <CoffeeShell
        title="Brühen"
        subtitle="Bohne · Methode · Stoppuhr · Speichern."
      >
        <BrewFlow />
      </CoffeeShell>
    </main>
  );
}
