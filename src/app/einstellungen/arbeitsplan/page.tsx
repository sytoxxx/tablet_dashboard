"use client";

import { AppNav } from "@/components/shared/app-nav";
import { useAppData } from "@/components/providers/data-provider";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/format";
import type { WeekdayKey, WorkShiftDay } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

export default function ArbeitsplanSettingsPage() {
  const { getPerson } = useAppData();
  const birgit = getPerson("birgit");

  if (!birgit || birgit.schedule.type !== "work") {
    return (
      <main className="mx-auto max-w-3xl px-5 py-8">
        <AppNav showSettings={false} />
        <EmptyState title="Kein Arbeitsplan" description="Birgit hat keinen work-Schedule." />
      </main>
    );
  }

  const week = birgit.schedule.week;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6 sm:px-8">
      <AppNav showSettings={false} backLabel="Einstellungen" backHref="/einstellungen" />
      <header>
        <h1 className="font-display text-4xl tracking-tight">Arbeitsplan · Birgit</h1>
        <p className="mt-2 text-[color:var(--quiet)]">Schichten nach Wochentag.</p>
      </header>

      <div className="space-y-6">
        {WEEKDAY_ORDER.map((day) => (
          <WorkDayBlock key={day} day={day} shift={week[day]} />
        ))}
      </div>
    </main>
  );
}

function WorkDayBlock({ day, shift }: { day: WeekdayKey; shift?: WorkShiftDay }) {
  return (
    <section className="border-t border-[color:var(--hairline)] pt-5">
      <h2 className="mb-2 text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
        {WEEKDAY_LABELS[day]}
      </h2>
      {!shift ? (
        <p className="text-[color:var(--quiet)]">Frei</p>
      ) : (
        <div>
          <p className="text-xl font-medium">{shift.label}</p>
          <p className="mt-1 tabular-nums text-lg">
            {shift.start} – {shift.end} · {shift.location}
          </p>
          {shift.notes ? <p className="mt-1 text-[color:var(--quiet)]">{shift.notes}</p> : null}
        </div>
      )}
    </section>
  );
}
