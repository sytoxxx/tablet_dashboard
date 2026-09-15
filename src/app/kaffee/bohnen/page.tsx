"use client";

import { CoffeeShell } from "@/components/coffee/coffee-shell";
import { BeansList } from "@/components/coffee/beans-list";

export default function BohnenPage() {
  return (
    <main>
      <CoffeeShell title="Meine Bohnen" subtitle="🫘 Karten mit dem, was du hinterlegt hast.">
        <BeansList />
      </CoffeeShell>
    </main>
  );
}
