"use client";

import { CoffeeShell } from "@/components/coffee/coffee-shell";
import { CoffeeRecommendations } from "@/components/coffee/coffee-recommendations";

export default function EmpfehlungenPage() {
  return (
    <main>
      <CoffeeShell
        title="Empfehlungen"
        subtitle="Nur aus echten gespeicherten Daten."
      >
        <CoffeeRecommendations />
      </CoffeeShell>
    </main>
  );
}
