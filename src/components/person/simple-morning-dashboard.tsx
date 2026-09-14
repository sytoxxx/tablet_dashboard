"use client";

import { useMemo } from "react";
import type { DayIntelligenceView } from "@/lib/day/intelligence";
import { personalizedGreeting } from "@/lib/day/greeting";
import { MorningNav } from "@/components/shared/morning-nav";
import { LiveClock } from "@/components/shared/live-clock";
import { DayFlowHero } from "@/components/person/day-flow-hero";
import { WorkShiftSection } from "@/components/person/work-shift";
import { BusSection } from "@/components/person/bus-section";
import { WeatherSection } from "@/components/person/weather-section";
import { CalendarSection } from "@/components/person/calendar-section";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import { formatGermanDate, WEEKDAY_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Extremely simple morning layout for Birgit (and Heidi).
 * No Admin, no tech jargon — greeting, date, work/plan, bus, weather, appointments.
 */
export function SimpleMorningDashboard({
  view,
  wallNow,
  mode,
  simple = false,
  busMessage,
  busEmptyTitle,
  busUpcoming,
  busMatched,
  busEnabled = true,
  busOffline,
  busUnavailable,
  busDataAgeLabel,
  weatherPlace,
}: {
  view: DayIntelligenceView;
  wallNow: Date;
  mode: "work" | "personal";
  simple?: boolean;
  busMessage?: string | null;
  busEmptyTitle?: string | null;
  busUpcoming?: Array<{ time: string; line: string; destination: string }>;
  busMatched?: boolean;
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

  return (
    <div className="morning-shell mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5 sm:gap-6 sm:px-8 sm:py-6 lg:px-10 landscape-tablet:gap-4 landscape-tablet:py-4">
      <MorningNav quiet={mode === "work"} />

      <header className="animate-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">
            {WEEKDAY_LABELS[view.weekdayKey]}
            {view.focusIsTomorrow ? " · Morgen" : ""}
          </p>
          <h1
            className="font-display text-4xl leading-tight tracking-tight sm:text-5xl landscape-tablet:text-5xl"
            style={{ color: view.accent }}
          >
            {headline}
          </h1>
          <p className="text-base text-[color:var(--quiet)] sm:text-lg" suppressHydrationWarning>
            {formatGermanDate(wallNow)}
          </p>
        </div>
        <LiveClock className="hidden sm:block landscape-tablet:block" />
      </header>

      <div
        className={cn(
          "animate-rise grid gap-6",
          "landscape-tablet:grid-cols-[1.35fr_1fr] landscape-tablet:gap-5 landscape-tablet:items-start",
          "lg:grid-cols-[1.35fr_1fr]",
        )}
        style={{ animationDelay: "60ms" }}
      >
        <div className="space-y-6 landscape-tablet:space-y-5">
          {mode === "work" ? (
            view.workShift ? (
              <WorkShiftSection shift={view.workShift} simple />
            ) : (
              <WorkShiftSection shift={null} simple />
            )
          ) : (
            <>
              <DayFlowHero flow={view.dayFlow} />
              <Section title="Heute">
                {view.timetable.length === 0 ? (
                  <EmptyState
                    title="Nichts Festes"
                    description="Du kannst den Tag frei gestalten."
                  />
                ) : (
                  <ul className="space-y-3">
                    {view.timetable.slice(0, 4).map((entry) => (
                      <li
                        key={`${entry.time}-${entry.subject}`}
                        className="flex gap-4 text-lg"
                      >
                        <span className="w-16 shrink-0 tabular-nums text-[color:var(--quiet)]">
                          {entry.time}
                        </span>
                        <span>
                          {entry.subject}
                          {entry.room ? (
                            <span className="text-[color:var(--quiet)]"> · {entry.room}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}

          {view.mitnehmen.length > 0 ? (
            <Section title="Mitnehmen">
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-lg">
                {view.mitnehmen.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <aside className="space-y-5 landscape-tablet:space-y-4">
          {view.displayPrefs.showBus ? (
            <BusSection
              bus={view.nextBus}
              stopName={view.busStopName}
              hasBusConfig={Boolean(view.busStopName) && busEnabled}
              busEnabled={busEnabled}
              message={busMessage}
              emptyTitle={busEmptyTitle}
              upcoming={busUpcoming}
              simple={simple || mode === "work"}
              matchedToWork={busMatched}
              offline={busOffline}
              unavailable={busUnavailable}
              dataAgeLabel={busDataAgeLabel}
            />
          ) : null}
          {view.displayPrefs.showWeather ? (
            <WeatherSection
              weather={view.weather}
              simple={simple || mode === "work"}
              place={weatherPlace}
            />
          ) : null}
          {view.displayPrefs.showCalendar && view.calendar.length > 0 ? (
            <CalendarSection events={view.calendar} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
