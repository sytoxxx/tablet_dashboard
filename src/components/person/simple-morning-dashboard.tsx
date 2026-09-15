"use client";

import type { DayIntelligenceView } from "@/lib/day/intelligence";
import type { MorningOverview } from "@/lib/morning/types";
import type { WardrobeCatalog } from "@/lib/wardrobe/model";
import type { WorkTravelLive } from "@/hooks/use-bus-live";
import { MorningNav } from "@/components/shared/morning-nav";
import { LiveClock } from "@/components/shared/live-clock";
import { DayFlowHero } from "@/components/person/day-flow-hero";
import { WorkShiftSection } from "@/components/person/work-shift";
import { WorkTravelSection } from "@/components/person/work-travel-section";
import { MorningTimelineSection } from "@/components/person/morning-timeline-section";
import { EveningPrepSection } from "@/components/person/evening-prep-section";
import { BusSection } from "@/components/person/bus-section";
import { WeatherSection } from "@/components/person/weather-section";
import { CalendarSection } from "@/components/person/calendar-section";
import { Section } from "@/components/section";
import { formatGermanDate, WEEKDAY_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Clarity-first morning layout for Birgit & Heidi (work mode).
 * Greeting + date → Arbeit / Losfahren → Wetter. No clothing tips.
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
  leaveReminderActive = false,
  leaveReminderLabel = null,
  digitalWardrobe = null,
  onExcludeCombination,
  onWardrobeChange,
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
  leaveReminderActive?: boolean;
  leaveReminderLabel?: string | null;
  digitalWardrobe?: WardrobeCatalog | null;
  onExcludeCombination?: (combinationKey: string) => void;
  onWardrobeChange?: (catalog: WardrobeCatalog) => void;
}) {
  const headline = overview.greeting;
  const isWorkMode = mode === "work";
  const showCalendar =
    !isWorkMode &&
    view.displayPrefs.showCalendar &&
    overview.visibility.appointments &&
    overview.appointments.length > 0;
  const showBus = view.displayPrefs.showBus && overview.visibility.bus;
  const showWeather =
    view.displayPrefs.showWeather && overview.visibility.weather;
  const showTimeline = overview.visibility.timeline;
  const showEveningPrep = overview.visibility.eveningPrep;

  const useWorkTravel =
    mode === "work" &&
    workTravel &&
    (workTravel.status === "on-time" ||
      workTravel.status === "no-connection" ||
      workTravel.status === "cancelled");

  const leaveIsUrgent =
    overview.timeline?.state === "leave_soon" ||
    overview.timeline?.state === "leave_now" ||
    overview.timeline?.state === "late" ||
    overview.timeline?.state === "en_route";

  return (
    <div
      className={cn(
        "morning-shell mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-5 sm:gap-6 sm:px-8 sm:py-6 lg:px-10 landscape-tablet:gap-4 landscape-tablet:py-4",
        overview.focusIsTomorrow && "daypart-evening",
      )}
    >
      <MorningNav quiet={mode === "work"} />

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
          "landscape-tablet:grid-cols-[1.45fr_0.9fr] landscape-tablet:gap-5 landscape-tablet:items-start",
          "lg:grid-cols-[1.45fr_0.9fr]",
        )}
        style={{ animationDelay: "60ms" }}
      >
        <div className="space-y-5 landscape-tablet:space-y-5">
          {/* Work commute covers Arbeit + Losfahren — avoid duplicating timeline. */}
          {mode === "work" && useWorkTravel ? (
            <>
              <WorkTravelSection
                plan={workTravel}
                workLabel={view.workShift?.label}
                leaveEmphasis="hero"
                workEmphasis="secondary"
              />
              {leaveReminderActive ? (
                <p className="px-1 text-sm text-[color:var(--quiet)]">
                  Erinnerung: {leaveReminderLabel?.trim() || "Bald losfahren"}
                </p>
              ) : null}
            </>
          ) : showTimeline ? (
            <MorningTimelineSection
              timeline={overview.timeline}
              simple
              reminderActive={leaveReminderActive}
              reminderLabel={leaveReminderLabel}
              emphasis={leaveIsUrgent ? "hero" : "secondary"}
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

          {mode === "work" ? (
            !useWorkTravel && !showTimeline && !showEveningPrep ? (
              <WorkShiftSection
                shift={view.workShift}
                simple
                emphasis="hero"
              />
            ) : null
          ) : (
            <>
              <DayFlowHero flow={view.dayFlow} dominant title="Stundenplan" />
              {view.timetable.length > 0 ? (
                <Section title="Stundenplan" emphasis="secondary">
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
        </div>

        <aside className="space-y-4 landscape-tablet:space-y-4">
          {showWeather ? (
            <WeatherSection
              weather={overview.weather.weather ?? view.weather}
              simple={simple || mode === "work"}
              place={weatherPlace}
              showClothingTip={false}
              emphasis="secondary"
            />
          ) : null}

          {showBus && !useWorkTravel && !showTimeline ? (
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
              emphasis="tertiary"
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
