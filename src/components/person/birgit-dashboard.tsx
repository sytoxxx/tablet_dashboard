"use client";

import type { TodayView } from "@/lib/types";
import { AppNav } from "@/components/shared/app-nav";
import { LiveClock } from "@/components/shared/live-clock";
import { WorkShiftSection } from "@/components/person/work-shift";
import { BusSection } from "@/components/person/bus-section";
import { WeatherSection } from "@/components/person/weather-section";
import { CalendarSection } from "@/components/person/calendar-section";
import { TasksSection } from "@/components/person/tasks-section";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import { WEEKDAY_LABELS } from "@/lib/format";

export function BirgitDashboard({ view }: { view: TodayView }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <AppNav />

      <header className="animate-rise flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">
            {WEEKDAY_LABELS[view.weekdayKey]} · Arbeit
          </p>
          <h1
            className="font-display text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            style={{ color: view.accent }}
          >
            {view.greeting}
          </h1>
          <p className="text-lg text-[color:var(--quiet)]">Dein Schichttag auf einen Blick.</p>
        </div>
        <LiveClock />
      </header>

      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr]">
        <div className="animate-rise space-y-10" style={{ animationDelay: "80ms" }}>
          <WorkShiftSection shift={view.workShift} />
          <Section title="Mitnehmen">
            {view.mitnehmen.length === 0 ? (
              <EmptyState title="Nichts einzupacken" description="Heute brauchst du nichts Extra." />
            ) : (
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-lg">
                {view.mitnehmen.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="animate-rise space-y-8" style={{ animationDelay: "140ms" }}>
          <BusSection
            bus={view.nextBus}
            stopName={view.busStopName}
            hasBusConfig={Boolean(view.busStopName)}
          />
          <WeatherSection weather={view.weather} />
          <CalendarSection events={view.calendar} />
          <TasksSection tasks={view.tasks} />
        </aside>
      </div>
    </div>
  );
}
