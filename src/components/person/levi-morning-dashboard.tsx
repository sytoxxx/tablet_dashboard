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
import { WeatherHeaderGlance } from "@/components/person/weather-header-glance";
import { CalendarSection } from "@/components/person/calendar-section";
import { TasksSection } from "@/components/person/tasks-section";
import { NextUpSection } from "@/components/person/next-up-section";
import { Section } from "@/components/section";
import { resolveNextUpGlance } from "@/lib/morning/work-priority";
import {
  detailedClothingLayers,
  isValidTempC,
} from "@/lib/weather/clothing";
import { WEEKDAY_LABELS } from "@/lib/format";
import type { SchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/types";
import { cn } from "@/lib/utils";

/**
 * Levi — school priorities, landscape control-center header.
 *
 * Order: Als Nächstes → Schule/Tagesplan → Wetter top-right → Aufgaben/Termine
 * → Wochenwetter. No work-week strip. No invented bus (walk is normal).
 * Detailed clothing ✓ (compact tertiary under school when weather known).
 */
export function LeviMorningDashboard({
  view,
  overview,
  wallNow,
  busMessage: _busMessage,
  busEmptyTitle: _busEmptyTitle,
  busUpcoming: _busUpcoming,
  busMatched: _busMatched,
  busIsTestData: _busIsTestData,
  busEnabled = true,
  busOffline: _busOffline,
  busUnavailable: _busUnavailable,
  busDataAgeLabel: _busDataAgeLabel,
  weatherPlace: _weatherPlace,
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
  void _weatherPlace;
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

  const clothingLine = useMemo(() => {
    if (!showWeather || !weather || !isValidTempC(weather.temperatureC)) {
      return null;
    }
    return detailedClothingLayers({
      temperatureC: weather.temperatureC,
      rainMm: weather.rainMm,
      weatherCode: weather.weatherCode,
    });
  }, [showWeather, weather]);

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
        "morning-shell mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-4 sm:gap-5 sm:px-8 sm:py-5 lg:max-w-5xl lg:px-10",
        "landscape-tablet:max-w-[74rem] landscape-tablet:gap-3 landscape-tablet:px-6 landscape-tablet:py-3",
        "pb-20 landscape-tablet:pb-14",
        daypartShellClass(greetingBucket),
        eveningFocus ? "daypart-evening" : "",
      )}
    >
      <MorningNav />

      <header className="animate-rise flex items-start justify-between gap-4 sm:gap-6">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase landscape-tablet:text-xs">
            {WEEKDAY_LABELS[view.weekdayKey]} · {dayLabel} · Schule
          </p>
          <DaypartGreeting
            name={overview.displayName}
            className="font-display text-3xl leading-tight tracking-tight sm:text-4xl landscape-tablet:text-[2.5rem]"
            style={{ color: view.accent }}
          />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:gap-3">
          {showWeather ? (
            <WeatherHeaderGlance
              weather={weather}
              focusTomorrow={eveningFocus}
              now={wallNow}
            />
          ) : null}
          <LiveClock
            stacked={false}
            className="text-right [&_p:last-child]:font-display [&_p:last-child]:text-3xl [&_p:last-child]:tabular-nums landscape-tablet:[&_p:last-child]:text-2xl"
          />
        </div>
      </header>

      <div
        className={cn(
          "animate-rise flex flex-col gap-4 landscape-tablet:gap-3",
          "landscape-tablet:grid landscape-tablet:grid-cols-2 landscape-tablet:items-start",
        )}
        style={{ animationDelay: "60ms" }}
      >
        {showEveningPrep ? (
          <div className="landscape-tablet:col-span-2">
            <EveningPrepSection
              prep={overview.eveningPrep}
              simple
              digitalWardrobe={digitalWardrobe}
              onExcludeCombination={onExcludeCombination}
              onWardrobeChange={onWardrobeChange}
            />
          </div>
        ) : null}

        {showNextUp ? (
          <div className="landscape-tablet:col-span-2">
            <NextUpSection
              next={nextUp}
              emphasis={
                nextUp.title.includes("nichts Dringendes")
                  ? "tertiary"
                  : "secondary"
              }
            />
          </div>
        ) : null}

        {/* Schule / Tagesplan — primary column on landscape */}
        {showSchoolPlan ? (
          <div
            className={cn(
              !showMitnehmen && !clothingLine
                ? "landscape-tablet:col-span-2"
                : undefined,
            )}
          >
            <DayFlowHero
              flow={view.dayFlow}
              dominant={!leaveIsUrgent}
              title="Schule"
            />
          </div>
        ) : null}

        {(showMitnehmen || clothingLine) && (
          <div className="flex flex-col gap-3 landscape-tablet:gap-2.5">
            {showMitnehmen ? (
              <Section title="Mitnehmen" emphasis="secondary">
                {mitnehmenEmpty ? (
                  <p className="text-base text-[color:var(--quiet)] landscape-tablet:text-sm">
                    {overview.itemsToTakeEmptyMessage ||
                      "Heute nichts Besonderes mitnehmen."}
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-x-3 gap-y-2 text-xl font-medium landscape-tablet:gap-y-1.5 landscape-tablet:text-lg">
                    {overview.itemsToTake.map((item) => (
                      <li
                        key={item}
                        className="rounded-2xl bg-[color:var(--bg)]/70 px-4 py-2 landscape-tablet:rounded-xl landscape-tablet:px-3 landscape-tablet:py-1.5"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            ) : null}

            {clothingLine ? (
              <Section title="Kleidung" emphasis="tertiary">
                <p className="text-lg font-medium text-[color:var(--ink)] landscape-tablet:text-base">
                  {clothingLine}
                </p>
              </Section>
            ) : null}
          </div>
        )}

        {/* Anfahrt — walk / timeline only when relevant; never invent bus */}
        {showTimeline ? (
          <div className="landscape-tablet:col-span-2">
            <MorningTimelineSection
              timeline={overview.timeline}
              reminderActive={leaveReminderActive}
              reminderLabel={leaveReminderLabel}
              emphasis={leaveIsUrgent ? "hero" : "secondary"}
            />
          </div>
        ) : null}

        {showAnfahrt ? (
          <div className="landscape-tablet:col-span-2">
            <WorkTravelSection
              plan={overview.travelPlan}
              leaveEmphasis="secondary"
            />
          </div>
        ) : null}

        {/* Aufgaben / Termine */}
        {showTasks ? (
          <div
            className={
              showCalendar ? undefined : "landscape-tablet:col-span-2"
            }
          >
            <TasksSection tasks={overview.importantTasks} morningOnly />
          </div>
        ) : null}

        {showCalendar ? (
          <div
            className={showTasks ? undefined : "landscape-tablet:col-span-2"}
          >
            <CalendarSection events={overview.appointments} compact />
          </div>
        ) : null}

        {/* Wochenwetter */}
        {showWeather ? (
          <div className="landscape-tablet:col-span-2">
            <WeatherSection
              weather={weather}
              showCurrent={false}
              showWeekStrip
              focusTomorrow={eveningFocus}
              now={wallNow}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
