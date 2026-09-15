"use client";

import { useMemo } from "react";
import type { DayIntelligenceView } from "@/lib/day/intelligence";
import type { MorningOverview } from "@/lib/morning/types";
import type { WardrobeCatalog } from "@/lib/wardrobe/model";
import { MorningNav } from "@/components/shared/morning-nav";
import { LiveClock } from "@/components/shared/live-clock";
import {
  DaypartGreeting,
  daypartShellClass,
  useGreetingBucket,
} from "@/components/shared/daypart-greeting";
import { DayFlowHero } from "@/components/person/day-flow-hero";
import { WorkTravelSection } from "@/components/person/work-travel-section";
import { MorningTimelineSection } from "@/components/person/morning-timeline-section";
import { EveningPrepSection } from "@/components/person/evening-prep-section";
import { WeatherSection } from "@/components/person/weather-section";
import { CalendarSection } from "@/components/person/calendar-section";
import { TasksSection } from "@/components/person/tasks-section";
import { NextUpSection } from "@/components/person/next-up-section";
import { Section } from "@/components/section";
import { resolveNextUpGlance } from "@/lib/morning/work-priority";
import { WEEKDAY_LABELS } from "@/lib/format";
import type { SchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/types";
import { cn } from "@/lib/utils";

/**
 * Levi — shared quiet block language, school priorities.
 *
 * Order: Als Nächstes → Schule/Tagesplan → Wetter → Anfahrt (only if relevant)
 * → Aufgaben/Termine → Wochenwetter.
 * No work-week strip. No invented bus (walk is normal). Detailed clothing ✓.
 */
export function LeviMorningDashboard({
  view,
  overview,
  busMessage: _busMessage,
  busEmptyTitle: _busEmptyTitle,
  busUpcoming: _busUpcoming,
  busMatched: _busMatched,
  busIsTestData: _busIsTestData,
  busEnabled = true,
  busOffline: _busOffline,
  busUnavailable: _busUnavailable,
  busDataAgeLabel: _busDataAgeLabel,
  weatherPlace,
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
  void _busMessage;
  void _busEmptyTitle;
  void _busUpcoming;
  void _busMatched;
  void _busIsTestData;
  void _busOffline;
  void _busUnavailable;
  void _busDataAgeLabel;
  void busEnabled;

  const greetingBucket = useGreetingBucket();
  const dayLabel = overview.focusIsTomorrow ? "Morgen" : "Heute";
  const eveningFocus = overview.focusIsTomorrow;

  const showMitnehmen =
    overview.visibility.itemsToTake && !overview.focusIsTomorrow;
  const showCalendar =
    view.displayPrefs.showCalendar &&
    overview.visibility.appointments &&
    overview.appointments.length > 0 &&
    !overview.focusIsTomorrow;
  const showTasks =
    view.displayPrefs.showTasks &&
    overview.visibility.importantTasks &&
    overview.importantTasks.length > 0 &&
    !overview.focusIsTomorrow;
  const showTimeline =
    overview.visibility.timeline && !overview.focusIsTomorrow;
  const showEveningPrep = overview.visibility.eveningPrep;
  const showWalkTravel =
    !overview.focusIsTomorrow &&
    overview.visibility.travelPlan &&
    overview.travelPlan?.mode === "walking" &&
    overview.travelPlan.status === "on-time" &&
    Boolean(overview.travelPlan.leaveHome);
  // Never invent a bus block for school walk — only real walk leave when relevant.
  const showAnfahrt = showWalkTravel && !showTimeline;
  const showWeather =
    view.displayPrefs.showWeather &&
    (overview.visibility.weather ||
      Boolean(overview.weather.weather ?? view.weather));
  const weather = overview.weather.weather ?? view.weather;
  const showSchoolPlan =
    overview.visibility.nextActivity && !overview.focusIsTomorrow;

  const leaveIsUrgent =
    overview.timeline?.state === "leave_soon" ||
    overview.timeline?.state === "leave_now" ||
    overview.timeline?.state === "late" ||
    overview.timeline?.state === "en_route";

  const mitnehmenEmpty = useMemo(
    () => overview.itemsToTake.length === 0,
    [overview.itemsToTake.length],
  );

  const nextUp = resolveNextUpGlance({
    isWorking: false,
    isFree: !showSchoolPlan && !showWalkTravel && !showTimeline,
    focusIsTomorrow: overview.focusIsTomorrow,
    leaveHome:
      showWalkTravel || showTimeline
        ? overview.travelPlan?.leaveHome ?? null
        : null,
    appointment: overview.appointments[0] ?? null,
    coffeeReady: overview.visibility.coffee,
    coffeeMessage: overview.coffee.message,
  });

  const showNextUp =
    !showEveningPrep || !nextUp.title.includes("nichts Dringendes");

  return (
    <div
      className={cn(
        "morning-shell mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-5 sm:gap-6 sm:px-8 sm:py-6 lg:max-w-4xl lg:px-10 landscape-tablet:max-w-5xl landscape-tablet:gap-5 landscape-tablet:py-5",
        daypartShellClass(greetingBucket),
        eveningFocus ? "daypart-evening" : "",
      )}
    >
      <MorningNav />

      <header className="animate-rise flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">
            {WEEKDAY_LABELS[view.weekdayKey]} · {dayLabel} · Schule
          </p>
          <DaypartGreeting
            name={overview.displayName}
            className="font-display text-3xl leading-tight tracking-tight sm:text-4xl landscape-tablet:text-[2.6rem]"
            style={{ color: view.accent }}
          />
        </div>
        <LiveClock className="sm:text-right" />
      </header>

      <div
        className="animate-rise flex flex-col gap-5"
        style={{ animationDelay: "60ms" }}
      >
        {showEveningPrep ? (
          <EveningPrepSection
            prep={overview.eveningPrep}
            simple
            digitalWardrobe={digitalWardrobe}
            onExcludeCombination={onExcludeCombination}
            onWardrobeChange={onWardrobeChange}
          />
        ) : null}

        {showNextUp ? (
          <NextUpSection
            next={nextUp}
            emphasis={
              nextUp.title.includes("nichts Dringendes")
                ? "tertiary"
                : "hero"
            }
          />
        ) : null}

        {/* 2. Schule / Tagesplan */}
        {showSchoolPlan ? (
          <DayFlowHero
            flow={view.dayFlow}
            dominant={!leaveIsUrgent}
            title="Schule"
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

        {/* 3. Wetter (+ Levi clothing) */}
        {showWeather ? (
          <WeatherSection
            weather={weather}
            place={weatherPlace}
            showDetailedClothing
            showCurrent
            showWeekStrip={false}
            focusTomorrow={eveningFocus}
            emphasis="secondary"
          />
        ) : null}

        {/* 4. Anfahrt — timeline / walk leave only when relevant; never invent bus */}
        {showTimeline ? (
          <MorningTimelineSection
            timeline={overview.timeline}
            reminderActive={leaveReminderActive}
            reminderLabel={leaveReminderLabel}
            emphasis={leaveIsUrgent ? "hero" : "secondary"}
          />
        ) : null}

        {showAnfahrt ? (
          <WorkTravelSection
            plan={overview.travelPlan}
            leaveEmphasis="secondary"
          />
        ) : null}

        {/* 5. Aufgaben / Termine */}
        {showTasks ? (
          <TasksSection tasks={overview.importantTasks} morningOnly />
        ) : null}

        {showCalendar ? (
          <CalendarSection events={overview.appointments} compact />
        ) : null}

        {/* 6. Wochenwetter */}
        {showWeather ? (
          <WeatherSection
            weather={weather}
            showCurrent={false}
            showWeekStrip
            focusTomorrow={eveningFocus}
          />
        ) : null}
      </div>
    </div>
  );
}
