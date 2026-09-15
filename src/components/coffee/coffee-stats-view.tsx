"use client";

import { useCoffeeCommand } from "@/components/coffee/coffee-command-provider";
import { useAppData } from "@/components/providers/data-provider";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import {
  beanLabel,
  statsForMonth,
  statsForToday,
  statsForWeek,
} from "@/lib/coffee";
import { COFFEE_METHOD_LABELS } from "@/lib/coffee/types";
import { formatTimer } from "@/lib/format";

export function CoffeeStatsView() {
  const { ready, data } = useCoffeeCommand();
  const { data: app } = useAppData();

  if (!ready) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!data.brews.length) {
    return (
      <EmptyState
        title="Noch keine Statistik"
        description="Sobald du Brühungen speicherst, erscheinen hier heute, Woche und Monat — pro Person und Bohne."
      />
    );
  }

  const today = statsForToday(data.brews);
  const week = statsForWeek(data.brews);
  const month = statsForMonth(data.brews);
  const personName = (id: string) =>
    app.persons.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="space-y-10">
      <PeriodBlock title="Heute" stats={today} beans={data.beans} personName={personName} />
      <PeriodBlock title="Diese Woche" stats={week} beans={data.beans} personName={personName} />
      <PeriodBlock title="Dieser Monat" stats={month} beans={data.beans} personName={personName} />

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Brühzeiten</h2>
        <p className="text-lg text-[color:var(--quiet)]">
          Ø heute:{" "}
          {today.avgDurationSeconds != null
            ? formatTimer(today.avgDurationSeconds)
            : "—"}
          {" · "}
          Ø Woche:{" "}
          {week.avgDurationSeconds != null
            ? formatTimer(week.avgDurationSeconds)
            : "—"}
          {" · "}
          Ø Monat:{" "}
          {month.avgDurationSeconds != null
            ? formatTimer(month.avgDurationSeconds)
            : "—"}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Methoden (Monat)</h2>
        <ul className="flex flex-wrap gap-2">
          {Object.entries(month.byMethod).map(([method, count]) => (
            <li
              key={method}
              className="rounded-2xl bg-[color:var(--surface)] px-4 py-2"
            >
              {COFFEE_METHOD_LABELS[method as keyof typeof COFFEE_METHOD_LABELS] ??
                method}
              : {count}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PeriodBlock({
  title,
  stats,
  beans,
  personName,
}: {
  title: string;
  stats: ReturnType<typeof statsForToday>;
  beans: Parameters<typeof beanLabel>[0];
  personName: (id: string) => string;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-3xl">{title}</h2>
      {stats.total === 0 ? (
        <p className="text-[color:var(--quiet)]">Keine Einträge in diesem Zeitraum.</p>
      ) : (
        <>
          <p className="text-2xl">
            <span className="font-display">{stats.total}</span>{" "}
            <span className="text-[color:var(--quiet)]">Brühungen</span>
          </p>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(stats.byPerson).map(([id, n]) => (
              <li key={id} className="rounded-2xl bg-[color:var(--surface)] px-4 py-2">
                {personName(id)}: {n}
              </li>
            ))}
          </ul>
          <p className="text-[color:var(--quiet)]">
            Meiste Bohne: {beanLabel(beans, stats.mostDrunkBeanId)}
            {stats.avgRating != null ? ` · Ø Bewertung ${stats.avgRating}` : ""}
          </p>
        </>
      )}
    </section>
  );
}
