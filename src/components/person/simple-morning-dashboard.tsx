"use client";

import type { DayIntelligenceView } from "@/lib/day/intelligence";
import type { MorningOverview } from "@/lib/morning/types";
import type { WardrobeCatalog } from "@/lib/wardrobe/model";
import type { Schedule } from "@/lib/types";

type WorkSchedule = Extract<Schedule, { type: "work" }>;
import type { WorkTravelLive } from "@/hooks/use-bus-live";
import { MorningNav } from "@/components/shared/morning-nav";
import { LiveClock } from "@/components/shared/live-clock";
import {
  DaypartGreeting,
  useGreetingBucket,
  daypartShellClass,
} from "@/components/shared/daypart-greeting";
import { WorkShiftSection } from "@/components/person/work-shift";
import { WorkBusSection } from "@/components/person/work-bus-section";
import { WeatherSection } from "@/components/person/weather-section";
import { WeatherHeaderGlance } from "@/components/person/weather-header-glance";
import { WorkWeekSection } from "@/components/person/work-week-section";
import { NextUpSection } from "@/components/person/next-up-section";
import { CalendarSection } from "@/components/person/calendar-section";
import { Section } from "@/components/section";
import {
  resolveNextUpGlance,
  resolveWorkMorningPriority,
} from "@/lib/morning/work-priority";
import { resolveWorkBusGlance } from "@/lib/morning/work-bus-glance";
import { formatGermanDate, WEEKDAY_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Birgit & Heidi — landscape control-center + shared Apple-like blocks.
 *
 * Landscape (10″ tablet): greeting | weather+clock · Next · Arbeit|Bus · Meine Woche.
 * Portrait / phone: same priority stack, weather stays in header (not a mid card).
 * No detailed clothing. Data gates unchanged.
 */
export function SimpleMorningDashboard({
  view,
  overview,
  wallNow,
  mode,
  simple = false,
  busMessage: _busMessage,
  busEmptyTitle: _busEmptyTitle,
  busUpcoming: _busUpcoming,
  busMatched: _busMatched,
  busEnabled = true,
  busOffline: _busOffline,
  busUnavailable: _busUnavailable,
  busDataAgeLabel: _busDataAgeLabel,
  weatherPlace: _weatherPlace,
  workTravel,
  workSchedule = null,
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
  workSchedule?: WorkSchedule | null;
  leaveReminderActive?: boolean;
  leaveReminderLabel?: string | null;
  digitalWardrobe?: WardrobeCatalog | null;
  onExcludeCombination?: (combinationKey: string) => void;
  onWardrobeChange?: (catalog: WardrobeCatalog) => void;
}) {
  void _digitalWardrobe;
  void _onExcludeCombination;
  void _onWardrobeChange;
  void _weatherPlace;
  void _busEmptyTitle;
  void _busMessage;
  void _busUpcoming;
  void _busMatched;
  void _busOffline;
  void _busUnavailable;
  void _busDataAgeLabel;
  void simple;

  const greetingBucket = useGreetingBucket();
  // Wording “Morgen” must follow schedule focus — not greeting night (00–04).
  // Night shell ambiance stays via daypartShellClass; bus quiet via nightQuiet.
  const eveningFocus = overview.focusIsTomorrow;
  const nightQuiet = greetingBucket === "night" && !overview.focusIsTomorrow;

  const priority = resolveWorkMorningPriority({
    workShift: view.workShift ?? overview.workShift,
    appointments: overview.appointments,
    focusIsTomorrow: overview.focusIsTomorrow,
  });

  const showWeather =
    view.displayPrefs.showWeather &&
    (overview.visibility.weather ||
      Boolean(overview.weather.weather ?? view.weather));
  const weather = overview.weather.weather ?? view.weather;
  // Meine Woche must stay visible for Birgit/Heidi — never hide for daypart/space.
  // Compact scroll lives in WorkWeekSection; gate only on having a work schedule.
  const showWeek = Boolean(workSchedule) && mode === "work";

  const leaveKnown =
    priority.isWorking &&
    mode === "work" &&
    workTravel?.status === "on-time" &&
    Boolean(workTravel.leaveHome);

  // Night: no senseless today’s bus. Evening: only when tomorrow leave known.
  const hideTodayBus =
    nightQuiet ||
    (eveningFocus && !leaveKnown) ||
    !busEnabled ||
    view.displayPrefs.showBus === false;

  const busGlance = resolveWorkBusGlance({
    plan: workTravel,
    isWorking: priority.isWorking && mode === "work",
    hideTodayBus,
    focusTomorrow: eveningFocus,
  });

  const nextUp = resolveNextUpGlance({
    isWorking: priority.isWorking,
    isFree: priority.isFree,
    focusIsTomorrow: overview.focusIsTomorrow,
    leaveHome: leaveKnown ? workTravel?.leaveHome : null,
    workStart: view.workShift?.start ?? overview.workShift?.start,
    appointment: priority.nextAppointment,
  });

  const showNextUp = !(
    priority.isFree && nextUp.title.includes("nichts Dringendes")
  );

  const showCalendar =
    view.displayPrefs.showCalendar &&
    overview.visibility.appointments &&
    overview.appointments.length > 0;

  const showBusBlock = priority.isWorking;
  const heuteTitle = overview.focusIsTomorrow ? "Morgen" : "Heute";

  return (
    <div
      className={cn(
        "morning-shell mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-4 sm:gap-5 sm:px-8 sm:py-5 lg:max-w-5xl lg:px-10",
        "landscape-tablet:max-w-[74rem] landscape-tablet:gap-2.5 landscape-tablet:px-6 landscape-tablet:py-2.5",
        // Mini-player sits bottom-left on landscape tablet — keep a thin pad.
        "pb-20 landscape-tablet:pb-12",
        daypartShellClass(greetingBucket),
      )}
    >
      <MorningNav quiet />

      <header className="animate-rise flex items-start justify-between gap-4 sm:gap-6 landscape-tablet:gap-5">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          {view.avatarImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={view.avatarImageUrl}
              alt=""
              aria-hidden
              className="size-12 shrink-0 rounded-full border border-[color:var(--hairline)] object-cover sm:size-14 landscape-tablet:size-11"
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase landscape-tablet:text-xs">
              {WEEKDAY_LABELS[view.weekdayKey]}
              {overview.focusIsTomorrow ? " · Morgen" : " · Heute"}
            </p>
            <DaypartGreeting
              name={overview.displayName}
              className="font-display text-4xl leading-tight tracking-tight sm:text-5xl landscape-tablet:text-[2.5rem]"
              style={{ color: view.accent }}
            />
            <p
              className="text-base text-[color:var(--quiet)] sm:text-lg landscape-tablet:hidden"
              suppressHydrationWarning
            >
              {formatGermanDate(wallNow)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 sm:gap-2">
          {showWeather ? (
            <WeatherHeaderGlance
              weather={weather}
              focusTomorrow={eveningFocus}
              now={wallNow}
            />
          ) : null}
          <LiveClock
            compact
            className="hidden sm:block landscape-tablet:block"
          />
        </div>
      </header>

      {/*
        Landscape control center: Next · Arbeit|Bus · Meine Woche (always on-screen).
        Phone keeps the same priority, single column — not a stretched mobile page.
      */}
      <div
        className={cn(
          "animate-rise flex flex-col gap-4 landscape-tablet:gap-2.5",
          "landscape-tablet:grid landscape-tablet:grid-cols-2 landscape-tablet:items-start",
        )}
        style={{ animationDelay: "60ms" }}
      >
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

        {priority.isFree ? (
          <div className={showBusBlock ? undefined : "landscape-tablet:col-span-2"}>
            <Section title={heuteTitle} emphasis="hero">
              <p className="font-display text-4xl tracking-tight sm:text-5xl landscape-tablet:text-4xl">
                {priority.freeDayCopy}
              </p>
            </Section>
          </div>
        ) : (
          <WorkShiftSection
            shift={view.workShift ?? overview.workShift}
            simple
            emphasis="hero"
            focusTomorrow={eveningFocus || overview.focusIsTomorrow}
          />
        )}

        {showBusBlock ? (
          <WorkBusSection
            glance={busGlance}
            emphasis={
              busGlance.kind === "none" && !eveningFocus ? "hero" : "secondary"
            }
          />
        ) : null}

        {leaveReminderActive && leaveKnown && !eveningFocus ? (
          <p className="px-1 text-base text-[color:var(--quiet)] landscape-tablet:col-span-2 landscape-tablet:text-sm">
            Erinnerung: {leaveReminderLabel?.trim() || "Bald losfahren"}
          </p>
        ) : null}

        {showWeek && workSchedule ? (
          <div
            className={cn(
              "landscape-tablet:col-span-2",
              showWeather &&
                "landscape-tablet:grid landscape-tablet:grid-cols-2 landscape-tablet:items-start landscape-tablet:gap-5",
            )}
          >
            <WorkWeekSection schedule={workSchedule} today={wallNow} compact />
            {showWeather ? (
              <WeatherSection
                weather={weather}
                showCurrent={false}
                showWeekStrip
                focusTomorrow={eveningFocus}
                now={wallNow}
              />
            ) : null}
          </div>
        ) : showWeather ? (
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

        {showCalendar ? (
          <div className="landscape-tablet:col-span-2">
            <CalendarSection events={overview.appointments} compact />
          </div>
        ) : null}
      </div>
    </div>
  );
}
