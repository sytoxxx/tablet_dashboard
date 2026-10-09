"use client";

import { CoffeeShell } from "@/components/coffee/coffee-shell";
import { CoffeeGuide } from "@/components/coffee/guide/coffee-guide";

export default function KaffeeMachenPage() {
  return (
    <main>
      <CoffeeShell title="Kaffee machen" compact>
        <CoffeeGuide />
      </CoffeeShell>
    </main>
  );
}
