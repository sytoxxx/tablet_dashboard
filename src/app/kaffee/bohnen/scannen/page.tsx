"use client";

import { CoffeeShell } from "@/components/coffee/coffee-shell";
import { BeanScanFlow } from "@/components/coffee/bean-scan-flow";

export default function BohneScannenPage() {
  return (
    <main>
      <CoffeeShell
        title="Bohne hinzufügen"
        subtitle="Scannen oder manuell — speichern erst nach Bestätigung."
      >
        <BeanScanFlow />
      </CoffeeShell>
    </main>
  );
}
