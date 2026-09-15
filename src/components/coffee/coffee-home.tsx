"use client";

import Link from "next/link";
import { useCoffeeCommand } from "@/components/coffee/coffee-command-provider";
import { useAppData } from "@/components/providers/data-provider";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { lastBrew, statsForToday } from "@/lib/coffee";
import { filterBrewsSince } from "@/lib/coffee/stats";
import { COFFEE_METHOD_LABELS } from "@/lib/coffee/types";
import { formatTimer } from "@/lib/format";
import { Button } from "@/components/ui/button";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Minimal coffee start screen: today count, last coffee, primary CTAs.
 * Details live on Brühen / Bohnen / Statistik.
 */
export function CoffeeHome() {
  const { ready, data } = useCoffeeCommand();
  const { data: app } = useAppData();

  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const now = new Date();
  const today = statsForToday(data.brews, now);
  const latestOverall = lastBrew(data.brews);
  const latestToday = lastBrew(
    filterBrewsSince(data.brews, startOfLocalDay(now), now),
  );
  const latest = latestToday ?? latestOverall;
  const personName = (id: string) =>
    app.persons.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-3">
        <Button
          asChild
          size="lg"
          className="h-14 rounded-2xl px-6 text-base active:scale-[0.97]"
        >
          <Link href="/kaffee/bruehen">Brühen</Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          size="lg"
          className="h-14 rounded-2xl bg-[color:var(--surface)] px-6 text-base active:scale-[0.97]"
        >
          <Link href="/kaffee/bohnen">Bohnen</Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          size="lg"
          className="h-14 rounded-2xl bg-[color:var(--surface)] px-6 text-base active:scale-[0.97]"
        >
          <Link href="/kaffee/statistik">Statistik</Link>
        </Button>
      </div>

      <section className="space-y-3" aria-labelledby="heute-title">
        <h2
          id="heute-title"
          className="text-sm font-semibold tracking-[0.16em] text-[color:var(--quiet)] uppercase"
        >
          Heute
        </h2>
        {today.total === 0 ? (
          <EmptyState
            title="Noch kein Kaffee heute"
            description="Starte eine Brühung — sie erscheint hier."
          />
        ) : (
          <div>
            <p className="font-display text-6xl tabular-nums tracking-tight">
              {today.total}
            </p>
            <p className="mt-2 text-lg text-[color:var(--quiet)]">
              {today.total === 1 ? "Kaffee heute" : "Kaffees heute"}
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="zuletzt-title">
        <h2
          id="zuletzt-title"
          className="text-sm font-semibold tracking-[0.16em] text-[color:var(--quiet)] uppercase"
        >
          Zuletzt
        </h2>
        {latest ? (
          <div className="rounded-[1.5rem] bg-[color:var(--surface)] px-6 py-5">
            <p className="font-display text-3xl tracking-tight">
              {personName(latest.personId)}
            </p>
            <p className="mt-2 text-lg text-[color:var(--quiet)]">
              {COFFEE_METHOD_LABELS[latest.method]}
              {" · "}
              <span className="tabular-nums">
                {formatTimer(latest.durationSeconds)}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-lg text-[color:var(--quiet)]">
            Noch keine Brühung gespeichert.
          </p>
        )}
      </section>
    </div>
  );
}
