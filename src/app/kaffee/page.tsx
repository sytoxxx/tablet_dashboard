"use client";

import { CoffeeShell } from "@/components/coffee/coffee-shell";
import { CoffeeHome } from "@/components/coffee/coffee-home";

export default function KaffeePage() {
  return (
    <main>
      <CoffeeShell title="Kaffee">
        <CoffeeHome />
      </CoffeeShell>
    </main>
  );
}
