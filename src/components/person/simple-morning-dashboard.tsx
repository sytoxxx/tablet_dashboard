"use client";

import type { DayIntelligenceView } from "@/lib/day/intelligence";
import type { MorningOverview } from "@/lib/morning/types";
import type { WardrobeCatalog } from "@/lib/wardrobe/model";
import type { WeekdayKey, WorkShiftDay } from "@/lib/types";
import type { WorkTravelLive } from "@/hooks/use-bus-live";
import { MorningNav } from "@/components/shared/morning-nav";
import { LiveClock } from "@/components/shared/live-clock";
import { WorkShiftSection } from "@/components/person/work-shift";
import { WorkTravelSection } from "@/components/person/work-travel-section";
import { BusSection } from "@/components/person/bus-section";
import { WeatherSection } from "@/components/person/weather-section";
import { WorkWeekSection } from "@/components/person/work-week-section";
import { formatGermanDate, WEEKDAY_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Extreme reduction for Birgit & Heidi:
 * Greeting → Heute → Losfahren → Nächster Bus → Wetter(+short tip) → Meine Woche.
 * No detailed clothing. Week strip is Birgit/Heidi-only (this dashboard).
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
  workTravel,
  workWeek = null,
  leaveReminderActive = false,
  leaveReminderLabel = null,
  digitalWardrobe: _digitalWardrobe = null,
  onExcludeCombination: _onExcludeCombination,
  onWardrobeChange: _onWardrobeChange,
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
  workTravel?: WorkTravelLive | null;
  /** Work schedule week — enables Meine Woche (Birgit/Heidi only). */
  workWeek?: Partial<Record<WeekdayKey, WorkShiftDay>> | null;
  leaveReminderActive?: boolean;
  leaveReminderLabel?: string | null;
  digitalWardrobe?: WardrobeCatalog | null;
  onExcludeCombination?: (combinationKey: string) => void;
  onWardrobeChange?: (catalog: WardrobeCatalog) => void;
}) {
  void _digitalWardrobe;
  void _onExcludeCombination;
  void _onWardrobeChange;

  const headline = overview.greeting;
  const showWeather =
    view.displayPrefs.showWeather && overview.visibility.weather;
  const showBus = view.displayPrefs.showBus && overview.visibility.bus;
  const showWeek = Boolean(workWeek) && mode === "work";

  const useWorkTravel =
    mode === "work" &&
    workTravel &&
    (workTravel.status === "on-time" ||
      workTravel.status === "no-connection" ||
      workTravel.status === "cancelled");

  return (
    <div
      className={cn(
        "morning-shell mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-5 sm:gap-6 sm:px-8 sm:py-6 lg:px-10 landscape-tablet:gap-4 landscape-tablet:py-4",
        overview.focusIsTomorrow && "daypart-evening",
      )}
    >
      <MorningNav quiet />

      <header className="animate-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">
            {WEEKDAY_LABELS[view.weekdayKey]}
            {overview.focusIsTomorrow ? " · Morgen" : " · Heute"}
          </p>
          <h1
            className="font-display text-4xl leading-tight tracking-tight sm:text-5xl landscape-tablet:text-5xl"
            style={{ color: view.accent }}
          >
            {headline}
          </h1>
          <p
            className="text-base text-[color:var(--quiet)] sm:text-lg"
            suppressHydrationWarning
          >
            {formatGermanDate(wallNow)}
          </p>
        </div>
        <LiveClock className="hidden sm:block landscape-tablet:block" />
      </header>

      <div
        className={cn(
          "animate-rise grid gap-5",
          "landscape-tablet:grid-cols-[1.5fr_0.85fr] landscape-tablet:gap-5 landscape-tablet:items-start",
          "lg:grid-cols-[1.5fr_0.85fr]",
        )}
        style={{ animationDelay: "60ms" }}
      >
        <div className="space-y-5">
          {useWorkTravel ? (
            <>
              <WorkTravelSection
                plan={workTravel}
                workLabel={view.workShift?.label}
                leaveEmphasis="hero"
                workEmphasis="secondary"
              />
              {leaveReminderActive ? (
                <p className="px-1 text-base text-[color:var(--quiet)]">
                  Erinnerung: {leaveReminderLabel?.trim() || "Bald losfahren"}
                </p>
              ) : null}
            </>
          ) : (
            <WorkShiftSection
              shift={view.workShift}
              simple
              emphasis="hero"
            />
          )}
        </div>

        <aside className="space-y-4">
          {showWeather ? (
            <WeatherSection
              weather={overview.weather.weather ?? view.weather}
              emphasis="secondary"
            />
          ) : null}

          {showBus && !useWorkTravel ? (
            <BusSection
              bus={view.nextBus}
              stopName={view.busStopName}
              hasBusConfig={Boolean(view.busStopName) && busEnabled}
              busEnabled={busEnabled}
              message={busMessage}
              emptyTitle={
                overview.bus.status === "cancelled" ||
                overview.bus.status === "none"
                  ? "Du musst heute keinen Bus nehmen."
                  : busEmptyTitle
              }
              upcoming={busUpcoming}
              simple={simple || mode === "work"}
              matchedToWork={busMatched || overview.bus.matchedToActivity}
              offline={busOffline}
              unavailable={busUnavailable}
              dataAgeLabel={busDataAgeLabel}
              arrivalStatus={overview.bus.status}
              arrivalMessage={
                overview.bus.status === "delayed"
                  ? "Bus hat Verspätung"
                  : overview.bus.status === "cancelled"
                    ? null
                    : overview.bus.message || null
              }
              emphasis="secondary"
            />
          ) : null}
        </aside>
      </div>

      {/* Meine Woche — Birgit/Heidi only (this component never mounts for Levi). */}
      {showWeek && workWeek ? (
        <div className="animate-rise" style={{ animationDelay: "90ms" }}>
          <WorkWeekSection week={workWeek} today={wallNow} />
        </div>
      ) : null}
    </div>
  );
}
