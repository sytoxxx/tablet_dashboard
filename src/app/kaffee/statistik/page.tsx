"use client";

import { CoffeeShell } from "@/components/coffee/coffee-shell";
import { CoffeeStatsView } from "@/components/coffee/coffee-stats-view";

export default function StatistikPage() {
  return (
    <main>
      <CoffeeShell title="Statistik" subtitle="Nur aus gespeicherten Brühungen.">
        <CoffeeStatsView />
      </CoffeeShell>
    </main>
  );
}
