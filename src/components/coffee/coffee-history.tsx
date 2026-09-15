"use client";

import { useCoffeeCommand } from "@/components/coffee/coffee-command-provider";
import { useAppData } from "@/components/providers/data-provider";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { beanLabel } from "@/lib/coffee";
import { COFFEE_METHOD_LABELS } from "@/lib/coffee/types";
import { formatTimer } from "@/lib/format";

export function CoffeeHistory() {
  const { ready, data } = useCoffeeCommand();
  const { data: app } = useAppData();

  if (!ready) return <Skeleton className="h-40 w-full" />;

  const sorted = [...data.brews].sort(
    (a, b) => Date.parse(b.brewedAt) - Date.parse(a.brewedAt),
  );

  if (!sorted.length) {
    return (
      <EmptyState
        title="Noch kein Verlauf"
        description="Gespeicherte Brühungen erscheinen hier als ruhige Liste — keine Tabelle."
      />
    );
  }

  const personName = (id: string) =>
    app.persons.find((p) => p.id === id)?.name ?? id;

  return (
    <ul className="space-y-4">
      {sorted.map((brew) => (
        <li
          key={brew.id}
          className="rounded-[1.5rem] bg-[color:var(--surface)] px-5 py-5 space-y-1"
        >
          <p className="font-display text-2xl tracking-tight">
            {formatWhen(brew.brewedAt)}
          </p>
          <p className="text-lg">
            {personName(brew.personId)} · {COFFEE_METHOD_LABELS[brew.method]} ·{" "}
            {formatTimer(brew.durationSeconds)}
          </p>
          <p className="text-[color:var(--quiet)]">
            {beanLabel(data.beans, brew.beanId)}
            {typeof brew.rating === "number" ? ` · ${brew.rating}/5` : ""}
          </p>
          {brew.note ? <p className="text-[color:var(--ink)]">{brew.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function formatWhen(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(t));
}
