"use client";

import Link from "next/link";
import { Coffee } from "lucide-react";
import type { CoffeeMorning } from "@/lib/morning/types";
import { Section } from "@/components/section";

/**
 * Compact coffee strip for Levi’s morning — reuses /kaffee timer, no new architecture.
 */
export function CoffeeMorningStrip({ coffee }: { coffee: CoffeeMorning }) {
  if (!coffee.enabled) return null;

  return (
    <Section title="Kaffee" emphasis="tertiary">
      <Link
        href="/kaffee"
        className="flex items-center gap-3 rounded-2xl bg-[color:var(--surface)]/80 px-4 py-3 transition-colors hover:bg-[color:var(--surface-strong)]"
      >
        <Coffee className="size-5 shrink-0 text-[color:var(--quiet)]" aria-hidden />
        <div className="min-w-0">
          <p className="text-lg font-medium">{coffee.message}</p>
          {coffee.preferredDrinkLabel ? (
            <p className="text-sm text-[color:var(--quiet)]">
              {coffee.preferredDrinkLabel}
            </p>
          ) : null}
        </div>
      </Link>
    </Section>
  );
}
