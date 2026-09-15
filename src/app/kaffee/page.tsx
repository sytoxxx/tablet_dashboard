"use client";

import { CoffeeShell } from "@/components/coffee/coffee-shell";
import { CoffeeHome } from "@/components/coffee/coffee-home";

export default function KaffeePage() {
  return (
    <main>
      <CoffeeShell
        title="Dein Kaffee-Dashboard"
        subtitle="Heute und diese Woche auf einen Blick — ruhig, ohne Tabellen."
      >
        <CoffeeHome />
      </CoffeeShell>
    </main>
  );
}
