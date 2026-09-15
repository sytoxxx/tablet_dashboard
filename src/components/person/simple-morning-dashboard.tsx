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
import { WorkBusSection } from "@/components/person/work-bus-section";
import { WeatherSection } from "@/components/person/weather-section";
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
 * Birgit & Heidi — shared Apple-like block stack, work-commute priority.
 *
 * Order: Als Nächstes → Arbeit → Bus/Arbeitsweg → Wetter → Meine Woche
 * → Wochenwetter → Termine. Mount only when relevant. No detailed clothing.
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
  const eveningFocus =
    overview.focusIsTomorrow ||
    greetingBucket === "evening" ||
    greetingBucket === "night";
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
  const showWeek = Boolean(workWeek) && mode === "work";

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

  const heuteTitle = overview.focusIsTomorrow ? "Morgen" : "Heute";

  return (
    <div
      className={cn(
        "morning-shell mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-5 sm:gap-6 sm:px-8 sm:py-6 lg:max-w-4xl lg:px-10 landscape-tablet:max-w-5xl landscape-tablet:gap-5 landscape-tablet:py-5",
        // Room for bottom-right music mini-player — never covers Meine Woche/Bus.
        "pb-24",
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

      {/* Single-column block order — Bus sits directly under Arbeit */}
      <div className="animate-rise flex flex-col gap-5" style={{ animationDelay: "60ms" }}>
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

        {priority.isFree ? (
          <Section title={heuteTitle} emphasis="hero">
            <p className="font-display text-4xl tracking-tight sm:text-5xl">
              {priority.freeDayCopy}
            </p>
          </Section>
        ) : (
          <WorkShiftSection
            shift={view.workShift ?? overview.workShift}
            simple
            emphasis="hero"
            focusTomorrow={eveningFocus || overview.focusIsTomorrow}
          />
        )}

        {priority.isWorking ? (
          <WorkBusSection
            glance={busGlance}
            emphasis={
              busGlance.kind === "none" && !eveningFocus ? "hero" : "secondary"
            }
          />
        ) : null}

        {leaveReminderActive && leaveKnown && !eveningFocus ? (
          <p className="px-1 text-base text-[color:var(--quiet)]">
            Erinnerung: {leaveReminderLabel?.trim() || "Bald losfahren"}
          </p>
        ) : null}

        {showWeather ? (
          <WeatherSection
            weather={weather}
            emphasis="secondary"
            showCurrent
            showWeekStrip={false}
            focusTomorrow={eveningFocus}
          />
        ) : null}

        {showWeek && workWeek ? (
          <WorkWeekSection week={workWeek} today={wallNow} />
        ) : null}

        {showWeather ? (
          <WeatherSection
            weather={weather}
            showCurrent={false}
            showWeekStrip
            focusTomorrow={eveningFocus}
          />
        ) : null}

        {showCalendar ? (
          <CalendarSection events={overview.appointments} compact />
        ) : null}
      </div>
    </div>
  );
}
