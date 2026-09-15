"use client";

import { CoffeeArea } from "@/components/coffee/coffee-area";
import { useAppData } from "@/components/providers/data-provider";
import Link from "next/link";

/** Legacy recipe countdown — optional; primary brew path is the stopwatch flow. */
export default function RezeptTimerPage() {
  const { data } = useAppData();
  return (
    <main>
      <div className="mx-auto max-w-5xl px-5 pt-4 sm:px-8">
        <Link
          href="/kaffee"
          className="text-base text-[color:var(--quiet)] underline-offset-4 hover:underline"
        >
          ← Zum Kaffee-Dashboard
        </Link>
      </div>
      <CoffeeArea drinks={data.coffeeDrinks} />
    </main>
  );
}
