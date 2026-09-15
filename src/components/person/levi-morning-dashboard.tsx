"use client";

import { useMemo } from "react";
import type { DayIntelligenceView } from "@/lib/day/intelligence";
import type { MorningOverview } from "@/lib/morning/types";
import type { WardrobeCatalog } from "@/lib/wardrobe/model";
import { MorningNav } from "@/components/shared/morning-nav";
import { LiveClock } from "@/components/shared/live-clock";
import { DayFlowHero } from "@/components/person/day-flow-hero";
import { BusSection } from "@/components/person/bus-section";
import { WorkTravelSection } from "@/components/person/work-travel-section";
import { MorningTimelineSection } from "@/components/person/morning-timeline-section";
import { EveningPrepSection } from "@/components/person/evening-prep-section";
import { WeatherSection } from "@/components/person/weather-section";
import { CalendarSection } from "@/components/person/calendar-section";
import { TasksSection } from "@/components/person/tasks-section";
import { Section } from "@/components/section";
import { WEEKDAY_LABELS } from "@/lib/format";
import type { SchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/types";

/**
 * Levi: Schule, Losfahren, Stundenplan, Mitnehmen, Wetter+Kleidung,
 * Termine/Aufgaben. Clothing tip only here (render gate).
 */
export function LeviMorningDashboard({
  view,
  overview,
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
  // Jarvis kept for call-site compatibility — not shown on morning glance.
  schoolJarvisSummary: _schoolJarvisSummary = null,
  schoolJarvisHandoffUrl: _schoolJarvisHandoffUrl = null,
  leaveReminderActive = false,
  leaveReminderLabel = null,
  digitalWardrobe = null,
  onExcludeCombination,
  onWardrobeChange,
}: {
  view: DayIntelligenceView;
  overview: MorningOverview;
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
  schoolJarvisSummary?: SchoolJarvisDailySummary | null;
  schoolJarvisHandoffUrl?: string | null;
  leaveReminderActive?: boolean;
  leaveReminderLabel?: string | null;
  digitalWardrobe?: WardrobeCatalog | null;
  onExcludeCombination?: (combinationKey: string) => void;
  onWardrobeChange?: (catalog: WardrobeCatalog) => void;
}) {
  void _schoolJarvisSummary;
  void _schoolJarvisHandoffUrl;

  const dayLabel = overview.focusIsTomorrow ? "Morgen" : "Heute";
  const headline = overview.greeting;

  const showMitnehmen = overview.visibility.itemsToTake;
  const showCalendar =
    view.displayPrefs.showCalendar &&
    overview.visibility.appointments &&
    overview.appointments.length > 0;
  const showTasks =
    view.displayPrefs.showTasks &&
    overview.visibility.importantTasks &&
    overview.importantTasks.length > 0;
  const showTimeline = overview.visibility.timeline;
  const showEveningPrep = overview.visibility.eveningPrep;
  const showWalkTravel =
    overview.visibility.travelPlan &&
    overview.travelPlan?.mode === "walking" &&
    overview.travelPlan.status === "on-time";
  const showBus =
    !showWalkTravel &&
    !showTimeline &&
    view.displayPrefs.showBus &&
    overview.visibility.bus;
  const showWeather =
    view.displayPrefs.showWeather && overview.visibility.weather;
  const showNext = overview.visibility.nextActivity;

  const leaveIsUrgent =
    overview.timeline?.state === "leave_soon" ||
    overview.timeline?.state === "leave_now" ||
    overview.timeline?.state === "late" ||
    overview.timeline?.state === "en_route";

  const mitnehmenEmpty = useMemo(
    () => overview.itemsToTake.length === 0,
    [overview.itemsToTake.length],
  );

  return (
    <div
      className={`morning-shell mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-4 sm:gap-5 sm:px-8 sm:py-5 lg:px-10 landscape-tablet:gap-3 landscape-tablet:py-3${overview.focusIsTomorrow ? " daypart-evening" : ""}`}
    >
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
        <div className="space-y-4">
          {showTimeline ? (
            <MorningTimelineSection
              timeline={overview.timeline}
              reminderActive={leaveReminderActive}
              reminderLabel={leaveReminderLabel}
              emphasis={leaveIsUrgent || !showNext ? "hero" : "secondary"}
            />
          ) : null}

          {showNext ? (
            <DayFlowHero
              flow={view.dayFlow}
              dominant={!showTimeline || !leaveIsUrgent}
              title="Stundenplan"
            />
          ) : null}

          {showWalkTravel && !showTimeline ? (
            <WorkTravelSection
              plan={overview.travelPlan}
              leaveEmphasis="hero"
            />
          ) : null}

          {showEveningPrep ? (
            <EveningPrepSection
              prep={overview.eveningPrep}
              simple
              digitalWardrobe={digitalWardrobe}
              onExcludeCombination={onExcludeCombination}
              onWardrobeChange={onWardrobeChange}
            />
          ) : null}

          {showMitnehmen ? (
            <Section title="Mitnehmen" emphasis="secondary">
              {mitnehmenEmpty ? (
                <p className="text-base text-[color:var(--quiet)]">
                  {overview.itemsToTakeEmptyMessage ||
                    "Heute nichts Besonderes mitnehmen."}
                </p>
              ) : (
                <ul className="flex flex-wrap gap-x-3 gap-y-2 text-xl font-medium">
                  {overview.itemsToTake.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl bg-[color:var(--bg)]/70 px-4 py-2"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          ) : null}

          {showCalendar ? (
            <CalendarSection events={overview.appointments} compact />
          ) : null}
        </div>

        <aside className="grid gap-3 content-start sm:grid-cols-2 landscape-tablet:grid-cols-1">
          {/* Clothing tip: render gate — Levi only (this dashboard). */}
          {showWeather ? (
            <WeatherSection
              weather={overview.weather.weather ?? view.weather}
              place={weatherPlace}
              showClothingTip
              emphasis="secondary"
            />
          ) : null}

          {showTasks ? (
            <TasksSection tasks={overview.importantTasks} morningOnly />
          ) : null}

          {showBus ? (
            <BusSection
              bus={view.nextBus}
              stopName={view.busStopName}
              hasBusConfig={Boolean(view.busStopName) && busEnabled}
              busEnabled={busEnabled}
              message={busMessage}
              emptyTitle={
                overview.bus.status === "none"
                  ? "Du musst heute keinen Bus nehmen."
                  : busEmptyTitle
              }
              upcoming={busUpcoming}
              matchedToWork={busMatched || overview.bus.matchedToActivity}
              isTestData={busIsTestData}
              offline={busOffline}
              unavailable={busUnavailable}
              dataAgeLabel={busDataAgeLabel}
              arrivalStatus={overview.bus.status}
              arrivalMessage={overview.bus.message || null}
              scheduleNote={overview.bus.scheduleNote}
              emphasis="tertiary"
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
