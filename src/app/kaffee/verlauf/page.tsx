"use client";

import { CoffeeShell } from "@/components/coffee/coffee-shell";
import { CoffeeHistory } from "@/components/coffee/coffee-history";

export default function VerlaufPage() {
  return (
    <main>
      <CoffeeShell title="Verlauf" subtitle="Lesbare Liste deiner Brühungen.">
        <CoffeeHistory />
      </CoffeeShell>
    </main>
  );
}
