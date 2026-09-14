"use client";

import { useMemo } from "react";
import type { DayIntelligenceView } from "@/lib/day/intelligence";
import { AppNav } from "@/components/shared/app-nav";
import { LiveClock } from "@/components/shared/live-clock";
import { DayFlowHero } from "@/components/person/day-flow-hero";
import { Timetable } from "@/components/timetable";
import { WorkShiftSection } from "@/components/person/work-shift";
import { BusSection } from "@/components/person/bus-section";
import { WeatherSection } from "@/components/person/weather-section";
import { CalendarSection } from "@/components/person/calendar-section";
import { TasksSection } from "@/components/person/tasks-section";
import { MiniMonthCalendar } from "@/components/person/mini-month-calendar";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import { WEEKDAY_LABELS } from "@/lib/format";

const TYPE_LABEL: Record<DayIntelligenceView["scheduleType"], string> = {
  school: "Schule",
  work: "Arbeit",
  personal: "Persönlich",
};

export function IntelligentDayDashboard({
  view,
  wallNow,
}: {
  view: DayIntelligenceView;
  wallNow: Date;
}) {
  const focusDate = useMemo(() => {
    const [y, m, d] = view.focusIsoDate.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }, [view.focusIsoDate]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <AppNav />

      <header className="animate-rise flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">
            {WEEKDAY_LABELS[view.weekdayKey]} · {TYPE_LABEL[view.scheduleType]}
            {view.focusIsTomorrow ? " · Morgen" : ""}
          </p>
          <h1
            className="font-display text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            style={{ color: view.accent }}
          >
            {view.greeting}
          </h1>
          {view.focusIsTomorrow ? (
            <p className="text-lg text-[color:var(--quiet)]">
              Abendmodus — Fokus auf den morgigen Plan.
            </p>
          ) : null}
        </div>
        <LiveClock />
      </header>

      {/* Morning priority stack */}
      <div className="animate-rise grid gap-10 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-10">
          <DayFlowHero flow={view.dayFlow} />

          <Section title="Mitnehmen">
            {view.mitnehmen.length === 0 ? (
              <EmptyState
                title="Nichts einzupacken"
                description="Heute brauchst du nichts Extra."
              />
            ) : (
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-lg">
                {view.mitnehmen.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </Section>

          {view.scheduleType === "work" ? (
            <WorkShiftSection shift={view.workShift} />
          ) : (
            <Section
              title={
                view.scheduleType === "school" ? "Stundenplan" : "Heute geplant"
              }
            >
              <Timetable entries={view.timetable} />
            </Section>
          )}
        </div>

        <aside className="space-y-8">
          <BusSection
            bus={view.nextBus}
            stopName={view.busStopName}
            hasBusConfig={Boolean(view.busStopName)}
          />
          <WeatherSection weather={view.weather} />
          <TasksSection tasks={view.importantTasks} morningOnly />
        </aside>
      </div>

      {/* Calendar below the morning essentials */}
      <div className="animate-rise grid gap-10 lg:grid-cols-2" style={{ animationDelay: "120ms" }}>
        <MiniMonthCalendar
          focusDate={focusDate}
          today={wallNow}
          highlights={view.monthHighlights}
        />
        <CalendarSection events={view.calendar} />
      </div>
    </div>
  );
}
