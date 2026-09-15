"use client";

import Link from "next/link";
import { useCoffeeCommand } from "@/components/coffee/coffee-command-provider";
import { useAppData } from "@/components/providers/data-provider";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import {
  beanLabel,
  lastBrew,
  statsForToday,
  statsForWeek,
} from "@/lib/coffee";
import { filterBrewsSince } from "@/lib/coffee/stats";
import { COFFEE_METHOD_LABELS } from "@/lib/coffee/types";
import { formatTimer } from "@/lib/format";
import { Button } from "@/components/ui/button";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

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
  const week = statsForWeek(data.brews, now);
  const activeBean = data.beans.find((b) => b.id === data.activeBeanId) ?? null;
  const latestOverall = lastBrew(data.brews);
  const latestToday = lastBrew(filterBrewsSince(data.brews, startOfLocalDay(now), now));
  const latest = latestToday ?? latestOverall;
  const personName = (id: string) =>
    app.persons.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" className="h-14 rounded-2xl px-6 text-base active:scale-[0.97]">
          <Link href="/kaffee/bruehen">Kaffee starten</Link>
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

      <section className="space-y-4" aria-labelledby="heute-title">
        <h2 id="heute-title" className="font-display text-3xl tracking-tight">
          Heute
        </h2>
        {today.total === 0 ? (
          <EmptyState
            title="Noch kein Kaffee heute"
            description="Starte eine Brühung — sie erscheint hier und in der Statistik."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Brühungen" value={String(today.total)} />
            <StatCard
              label="Aktive Bohne"
              value={activeBean?.name ?? "—"}
              quiet={!activeBean}
            />
            <StatCard
              label="Zuletzt"
              value={
                latest
                  ? `${personName(latest.personId)} · ${formatTimer(latest.durationSeconds)}`
                  : "—"
              }
            />
          </div>
        )}
        {today.total > 0 ? (
          <ul className="flex flex-wrap gap-2 text-[color:var(--quiet)]">
            {app.persons.map((p) => {
              const n = today.byPerson[p.id] ?? 0;
              if (!n) return null;
              return (
                <li
                  key={p.id}
                  className="rounded-2xl bg-[color:var(--surface)] px-4 py-2 text-base text-[color:var(--ink)]"
                >
                  {p.name}: {n}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="space-y-4" aria-labelledby="woche-title">
        <h2 id="woche-title" className="font-display text-3xl tracking-tight">
          Diese Woche
        </h2>
        {week.total === 0 ? (
          <EmptyState
            title="Diese Woche noch leer"
            description="Gespeicherte Brühungen füllen Totals, Lieblingsbohne und Ø-Bewertung."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Gesamt" value={String(week.total)} />
            <StatCard
              label="Meist getrunken"
              value={beanLabel(data.beans, week.mostDrunkBeanId)}
            />
            <StatCard
              label="Ø Bewertung"
              value={week.avgRating != null ? `${week.avgRating} / 5` : "—"}
              quiet={week.avgRating == null}
            />
          </div>
        )}
        {week.total > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {app.persons.map((p) => {
              const n = week.byPerson[p.id] ?? 0;
              if (!n) return null;
              return (
                <li
                  key={p.id}
                  className="rounded-2xl bg-[color:var(--surface)] px-4 py-2 text-base"
                >
                  {p.name}: {n}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3 border-t border-[color:var(--hairline)] pt-6">
        <Link
          href="/kaffee/empfehlungen"
          className="text-base text-[color:var(--brand)] underline-offset-4 hover:underline"
        >
          Empfehlungen
        </Link>
        <span className="text-[color:var(--quiet)]">·</span>
        <Link
          href="/kaffee/rezept-timer"
          className="text-base text-[color:var(--quiet)] underline-offset-4 hover:underline"
        >
          Rezept-Countdown
        </Link>
        {latest ? (
          <>
            <span className="text-[color:var(--quiet)]">·</span>
            <span className="text-base text-[color:var(--quiet)]">
              Letzte Methode: {COFFEE_METHOD_LABELS[latest.method]}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  quiet,
}: {
  label: string;
  value: string;
  quiet?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] bg-[color:var(--surface)] px-5 py-5">
      <p className="text-sm tracking-[0.12em] text-[color:var(--quiet)] uppercase">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-3xl tracking-tight ${quiet ? "text-[color:var(--quiet)]" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
