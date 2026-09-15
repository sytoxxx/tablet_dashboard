"use client";

import type { DayIntelligenceView } from "@/lib/day/intelligence";
import type { MorningOverview } from "@/lib/morning/types";
import type { WardrobeCatalog } from "@/lib/wardrobe/model";
import type { WeekdayKey, WorkShiftDay } from "@/lib/types";
import type { WorkTravelLive } from "@/hooks/use-bus-live";
import { MorningNav } from "@/components/shared/morning-nav";
import { LiveClock } from "@/components/shared/live-clock";
import {
  DaypartGreeting,
  useGreetingBucket,
  daypartShellClass,
} from "@/components/shared/daypart-greeting";
import { WorkShiftSection } from "@/components/person/work-shift";
import { WorkTravelSection } from "@/components/person/work-travel-section";
import { BusSection } from "@/components/person/bus-section";
import { WeatherSection } from "@/components/person/weather-section";
import { WorkWeekSection } from "@/components/person/work-week-section";
import { NextUpSection } from "@/components/person/next-up-section";
import { Section } from "@/components/section";
import {
  resolveNextUpGlance,
  resolveWorkMorningPriority,
} from "@/lib/morning/work-priority";
import { formatGermanDate, WEEKDAY_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Birgit & Heidi — personal day assistant.
 * Morning: Heute → Losfahren → Als Nächstes → Wetter → Meine Woche.
 * Evening: tomorrow plan, no leftover clutter; no detailed clothing.
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
  void weatherPlace;
  void busEmptyTitle;
  void simple;

  const greetingBucket = useGreetingBucket();
  const eveningFocus =
    overview.focusIsTomorrow ||
    greetingBucket === "evening" ||
    greetingBucket === "night";

  const priority = resolveWorkMorningPriority({
    workShift: view.workShift ?? overview.workShift,
    appointments: overview.appointments,
    focusIsTomorrow: overview.focusIsTomorrow,
  });

  const showWeather =
    view.displayPrefs.showWeather &&
    (overview.visibility.weather ||
      Boolean(overview.weather.weather ?? view.weather));
  const showWeek = Boolean(workWeek) && mode === "work";

  const travelUsable =
    priority.isWorking &&
    mode === "work" &&
    workTravel &&
    (workTravel.status === "on-time" ||
      workTravel.status === "no-connection" ||
      workTravel.status === "cancelled");

  const leaveKnown =
    Boolean(travelUsable) &&
    workTravel?.status === "on-time" &&
    Boolean(workTravel.leaveHome);

  const showStandaloneBus =
    priority.isWorking &&
    !eveningFocus &&
    !travelUsable &&
    view.displayPrefs.showBus &&
    overview.visibility.bus &&
    Boolean(view.nextBus);

  const nextUp = resolveNextUpGlance({
    isWorking: priority.isWorking,
    isFree: priority.isFree,
    focusIsTomorrow: overview.focusIsTomorrow,
    leaveHome: leaveKnown ? workTravel?.leaveHome : null,
    workStart: view.workShift?.start ?? overview.workShift?.start,
    appointment: priority.nextAppointment,
  });

  const heuteTitle = overview.focusIsTomorrow ? "Morgen" : "Heute";

  return (
    <div
      className={cn(
        "morning-shell mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-5 sm:gap-6 sm:px-8 sm:py-6 lg:px-10 landscape-tablet:gap-4 landscape-tablet:py-4",
        daypartShellClass(greetingBucket),
      )}
    >
      <MorningNav quiet />

      <header className="animate-rise flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">
            {WEEKDAY_LABELS[view.weekdayKey]}
            {overview.focusIsTomorrow ? " · Morgen" : " · Heute"}
          </p>
          <DaypartGreeting
            name={overview.displayName}
            className="font-display text-4xl leading-tight tracking-tight sm:text-5xl landscape-tablet:text-5xl"
            style={{ color: view.accent }}
          />
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
          "landscape-tablet:grid-cols-[1.55fr_0.85fr] landscape-tablet:gap-5 landscape-tablet:items-start",
          "lg:grid-cols-[1.55fr_0.85fr]",
        )}
        style={{ animationDelay: "60ms" }}
      >
        <div className="space-y-5">
          {priority.isFree ? (
            <Section title={heuteTitle} emphasis="hero">
              <p className="font-display text-4xl tracking-tight sm:text-5xl">
                {priority.freeDayCopy}
              </p>
            </Section>
          ) : travelUsable ? (
            <>
              <WorkTravelSection
                plan={workTravel}
                workLabel={view.workShift?.label}
                leaveEmphasis="hero"
                workEmphasis="secondary"
                includeLeave={leaveKnown && !eveningFocus}
                quietNoBus
              />
              {leaveReminderActive && leaveKnown && !eveningFocus ? (
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

          {/* Evening working day without travel: still show Arbeit only */}
          {eveningFocus && priority.isWorking && leaveKnown ? (
            <Section title="Losfahren" emphasis="secondary">
              <p className="text-xl text-[color:var(--ink)] sm:text-2xl">
                Morgen musst du um{" "}
                <span className="font-display text-5xl tabular-nums tracking-tight">
                  {workTravel?.leaveHome}
                </span>{" "}
                los.
              </p>
            </Section>
          ) : null}

          {!(
            priority.isFree &&
            nextUp.title.includes("nichts Dringendes")
          ) ? (
            <NextUpSection
              next={nextUp}
              emphasis={
                nextUp.title.includes("nichts Dringendes")
                  ? "tertiary"
                  : "secondary"
              }
            />
          ) : null}
        </div>

        <aside className="space-y-4">
          {showWeather ? (
            <WeatherSection
              weather={overview.weather.weather ?? view.weather}
              emphasis="secondary"
              showWeekStrip
              focusTomorrow={eveningFocus}
            />
          ) : (
            <Section title="Wetter" emphasis="tertiary">
              <p className="text-lg text-[color:var(--quiet)]">
                Wetter momentan nicht verfügbar.
              </p>
            </Section>
          )}

          {showStandaloneBus ? (
            <BusSection
              bus={view.nextBus}
              stopName={view.busStopName}
              hasBusConfig={Boolean(view.busStopName) && busEnabled}
              busEnabled={busEnabled}
              message={busMessage}
              emptyTitle="Du musst heute keinen Bus nehmen."
              upcoming={busUpcoming}
              simple
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
        </aside>
      </div>

      {showWeek && workWeek ? (
        <div className="animate-rise" style={{ animationDelay: "90ms" }}>
          <WorkWeekSection week={workWeek} today={wallNow} />
        </div>
      ) : null}
    </div>
  );
}
