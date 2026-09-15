"use client";

import { useCoffeeCommand } from "@/components/coffee/coffee-command-provider";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { buildRecommendations } from "@/lib/coffee/recommendations";

export function CoffeeRecommendations() {
  const { ready, data } = useCoffeeCommand();

  if (!ready) return <Skeleton className="h-32 w-full" />;

  const items = buildRecommendations(data.beans, data.brews);

  if (!items.length) {
    return (
      <EmptyState
        title="Noch keine Empfehlungen"
        description="Empfehlungen entstehen nur aus gespeicherten Brühungen und Bohnen — nichts Erfundenes."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-[1.5rem] bg-[color:var(--surface)] px-5 py-5 space-y-2"
        >
          <p className="font-display text-2xl tracking-tight">{item.title}</p>
          <p className="text-lg text-[color:var(--quiet)]">{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}
