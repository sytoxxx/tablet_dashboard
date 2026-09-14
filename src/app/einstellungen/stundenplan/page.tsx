"use client";

import { AppNav } from "@/components/shared/app-nav";
import { useAppData } from "@/components/providers/data-provider";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/format";
import type { SchoolDay, WeekdayKey } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

export default function StundenplanSettingsPage() {
  const { getPerson } = useAppData();
  const levi = getPerson("levi");

  if (!levi || levi.schedule.type !== "school") {
    return (
      <main className="mx-auto max-w-3xl px-5 py-8">
        <AppNav showSettings={false} />
        <EmptyState title="Kein Schulplan" description="Levi hat keinen school-Schedule." />
      </main>
    );
  }

  const week = levi.schedule.week;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-6 sm:px-8">
      <AppNav showSettings={false} backLabel="Einstellungen" backHref="/einstellungen" />
      <header>
        <h1 className="font-display text-4xl tracking-tight">Stundenplan · Levi</h1>
        <p className="mt-2 text-[color:var(--quiet)]">
          Wochenstruktur für späteren Upload. Heute wird über den Wochentag gewählt.
        </p>
      </header>

      <div className="space-y-8">
        {WEEKDAY_ORDER.map((day) => (
          <SchoolDayBlock key={day} day={day} plan={week[day]} />
        ))}
      </div>
    </main>
  );
}

function SchoolDayBlock({ day, plan }: { day: WeekdayKey; plan?: SchoolDay }) {
  return (
    <section className="border-t border-[color:var(--hairline)] pt-5">
      <h2 className="mb-3 text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
        {WEEKDAY_LABELS[day]}
      </h2>
      {!plan || plan.lessons.length === 0 ? (
        <p className="text-[color:var(--quiet)]">Frei</p>
      ) : (
        <ul className="space-y-2">
          {plan.lessons.map((lesson) => (
            <li key={lesson.id} className="grid grid-cols-[4.5rem_1fr_auto] gap-3 text-lg">
              <span className="tabular-nums">{lesson.time}</span>
              <span>{lesson.subject}</span>
              <span className="text-[color:var(--quiet)]">{lesson.room}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
