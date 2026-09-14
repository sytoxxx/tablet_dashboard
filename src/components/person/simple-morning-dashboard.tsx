"use client";

import type { DayIntelligenceView } from "@/lib/day/intelligence";
import type { MorningOverview } from "@/lib/morning/types";
import { MorningNav } from "@/components/shared/morning-nav";
import { LiveClock } from "@/components/shared/live-clock";
import { DayFlowHero } from "@/components/person/day-flow-hero";
import { WorkShiftSection } from "@/components/person/work-shift";
import { BusSection } from "@/components/person/bus-section";
import { WeatherSection } from "@/components/person/weather-section";
import { CalendarSection } from "@/components/person/calendar-section";
import { Section } from "@/components/section";
import { formatGermanDate, WEEKDAY_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Extremely simple morning layout for Birgit (and Heidi).
 * Phase 9: Birgit stays Arbeit → Bus → Wetter (+ optional hint).
 * Heidi gets a little more context (plan + mitnehmen + termine if present).
 */
export function SimpleMorningDashboard({
  view,
  overview,
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
  overview: MorningOverview;
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
  const headline = overview.greeting;
  const isBirgit = mode === "work";
  const showMitnehmen =
    !isBirgit && overview.itemsToTake.length > 0;
  const showCalendar =
    !isBirgit &&
    view.displayPrefs.showCalendar &&
    overview.visibility.appointments;
  const showBus = view.displayPrefs.showBus && overview.visibility.bus;
  const showWeather =
    view.displayPrefs.showWeather && overview.visibility.weather;
  const showHint = Boolean(view.hint) && (isBirgit || mode === "personal");

  return (
    <div className="morning-shell mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5 sm:gap-6 sm:px-8 sm:py-6 lg:px-10 landscape-tablet:gap-4 landscape-tablet:py-4">
      <MorningNav quiet={mode === "work"} />

      <header className="animate-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">
            {WEEKDAY_LABELS[view.weekdayKey]}
            {overview.focusIsTomorrow ? " · Morgen" : ""}
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
            <WorkShiftSection shift={view.workShift} simple />
          ) : (
            <>
              <DayFlowHero flow={view.dayFlow} />
              {view.timetable.length > 0 ? (
                <Section title="Heute">
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
                            <span className="text-[color:var(--quiet)]">
                              {" "}
                              · {entry.room}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
            </>
          )}

          {showMitnehmen ? (
            <Section title="Mitnehmen">
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-lg">
                {overview.itemsToTake.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {isBirgit && showHint ? (
            <p className="text-base text-[color:var(--quiet)]">{view.hint}</p>
          ) : null}
        </div>

        <aside className="space-y-5 landscape-tablet:space-y-4">
          {showBus ? (
            <BusSection
              bus={view.nextBus}
              stopName={view.busStopName}
              hasBusConfig={Boolean(view.busStopName) && busEnabled}
              busEnabled={busEnabled}
              message={busMessage}
              emptyTitle={
                overview.bus.status === "none"
                  ? "Kein passender Bus"
                  : busEmptyTitle
              }
              upcoming={busUpcoming}
              simple={simple || mode === "work"}
              matchedToWork={busMatched || overview.bus.matchedToActivity}
              offline={busOffline}
              unavailable={busUnavailable}
              dataAgeLabel={busDataAgeLabel}
              arrivalStatus={overview.bus.status}
              arrivalMessage={overview.bus.message || null}
            />
          ) : null}
          {showWeather ? (
            <WeatherSection
              weather={overview.weather.weather ?? view.weather}
              simple={simple || mode === "work"}
              place={weatherPlace}
            />
          ) : null}
          {showCalendar ? (
            <CalendarSection events={overview.appointments} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
