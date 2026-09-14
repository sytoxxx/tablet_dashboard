"use client";

import { useMemo } from "react";
import type { DayIntelligenceView } from "@/lib/day/intelligence";
import { personalizedGreeting } from "@/lib/day/greeting";
import { MorningNav } from "@/components/shared/morning-nav";
import { LiveClock } from "@/components/shared/live-clock";
import { DayFlowHero } from "@/components/person/day-flow-hero";
import { BusSection } from "@/components/person/bus-section";
import { WeatherSection } from "@/components/person/weather-section";
import { CalendarSection } from "@/components/person/calendar-section";
import { TasksSection } from "@/components/person/tasks-section";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import { WEEKDAY_LABELS } from "@/lib/format";

/**
 * Levi priority stack (10" landscape):
 * Greeting → Clock → Als Nächstes → Mitnehmen → Bus → Wetter → Termine → Wichtig
 */
export function LeviMorningDashboard({
  view,
  wallNow,
  busMessage,
  busEmptyTitle,
  busUpcoming,
  busMatched,
  busIsTestData,
  busEnabled = true,
  busOffline,
  busUnavailable,
  busDataAgeLabel,
  weatherPlace,
}: {
  view: DayIntelligenceView;
  wallNow: Date;
  busMessage?: string | null;
  busEmptyTitle?: string | null;
  busUpcoming?: Array<{ time: string; line: string; destination: string }>;
  busMatched?: boolean;
  busIsTestData?: boolean;
  busEnabled?: boolean;
  busOffline?: boolean;
  busUnavailable?: boolean;
  busDataAgeLabel?: string | null;
  weatherPlace?: string | null;
}) {
  const headline = useMemo(
    () => personalizedGreeting(view.displayName, wallNow),
    [view.displayName, wallNow],
  );

  const dayLabel = view.focusIsTomorrow ? "Morgen" : "Heute";

  return (
    <div className="morning-shell mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-4 sm:gap-4 sm:px-8 sm:py-5 lg:px-10 landscape-tablet:gap-3 landscape-tablet:py-3">
      <MorningNav />

      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">
            {WEEKDAY_LABELS[view.weekdayKey]} · {dayLabel} · Schule
          </p>
          <h1
            className="font-display text-3xl leading-tight tracking-tight sm:text-4xl landscape-tablet:text-[2.6rem]"
            style={{ color: view.accent }}
          >
            {headline}
          </h1>
        </div>
        <LiveClock className="sm:text-right" />
      </header>

      <div className="grid gap-4 landscape-tablet:grid-cols-[1.4fr_1fr] landscape-tablet:gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4 landscape-tablet:space-y-3">
          <DayFlowHero flow={view.dayFlow} dominant />

          <Section title="Mitnehmen">
            {view.mitnehmen.length === 0 ? (
              <EmptyState
                title="Nichts Extra"
                description="Schultasche wie immer reicht."
              />
            ) : (
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xl font-medium">
                {view.mitnehmen.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl bg-[color:var(--surface)] px-4 py-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {view.displayPrefs.showCalendar ? (
            <CalendarSection events={view.calendar} compact />
          ) : null}
        </div>

        <aside className="grid gap-3 sm:grid-cols-2 landscape-tablet:grid-cols-1">
          {view.displayPrefs.showBus ? (
            <BusSection
              bus={view.nextBus}
              stopName={view.busStopName}
              hasBusConfig={Boolean(view.busStopName) && busEnabled}
              busEnabled={busEnabled}
              message={busMessage}
              emptyTitle={busEmptyTitle}
              upcoming={busUpcoming}
              matchedToWork={busMatched}
              isTestData={busIsTestData}
              offline={busOffline}
              unavailable={busUnavailable}
              dataAgeLabel={busDataAgeLabel}
            />
          ) : null}
          {view.displayPrefs.showWeather ? (
            <WeatherSection weather={view.weather} place={weatherPlace} />
          ) : null}
          {view.displayPrefs.showTasks ? (
            <TasksSection tasks={view.importantTasks} morningOnly />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
