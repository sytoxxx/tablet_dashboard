import type {
  AppData,
  BusInfo,
  PersonId,
  PersonProfile,
  WeatherInfo,
} from "@/lib/types";
import { personalizedGreeting } from "@/lib/day/greeting";
import {
  buildDayIntelligence,
  type DayIntelligenceView,
} from "@/lib/day/intelligence";
import { EMPTY_BRING_MESSAGE } from "@/lib/day/bring";
import {
  blocksFromTimetable,
  blocksFromWorkShift,
} from "@/lib/day/schedule-flow";
import { resolveFocusMoment } from "@/lib/day/tomorrow";
import { resolveBusMorning } from "@/lib/morning/bus-status";
import {
  dayFlowFromNextActivity,
  filterRelevantAppointments,
  resolveNextActivity,
} from "@/lib/morning/next-activity";
import {
  buildMorningSummary,
  resolveCoffeeMorning,
  weatherTipFrom,
} from "@/lib/morning/summary";
import type {
  MorningOverview,
  MorningSectionKey,
  MorningVisibility,
} from "@/lib/morning/types";

export type MorningOverviewLive = {
  /** Live/local bus overlay from useBusLive (optional). */
  bus?: BusInfo | null;
  weather?: WeatherInfo | null;
  busMatched?: boolean;
  busEnabled?: boolean;
  busIsTestData?: boolean;
};

export type GetMorningOverviewOptions = {
  /** Full app data when resolving by personId. Required unless `person` is set. */
  data?: AppData;
  /** Direct person profile — skips id lookup when set. */
  person?: PersonProfile;
  live?: MorningOverviewLive;
  /**
   * Prebuilt day intelligence (avoids double work when the page already
   * computed buildDayIntelligence).
   */
  dayView?: DayIntelligenceView;
};

const LEVI_ORDER: MorningSectionKey[] = [
  "clock",
  "nextActivity",
  "itemsToTake",
  "bus",
  "weather",
  "appointments",
  "importantTasks",
  "coffee",
];

const BIRGIT_ORDER: MorningSectionKey[] = [
  "work",
  "bus",
  "weather",
  "hint",
];

/** Heidi: Arbeit/Plan · Bus · Wetter · Termine / wichtige Information */
const HEIDI_ORDER: MorningSectionKey[] = [
  "work",
  "nextActivity",
  "bus",
  "weather",
  "appointments",
  "hint",
];

function priorityOrderFor(id: PersonId): MorningSectionKey[] {
  if (id === "birgit") return BIRGIT_ORDER;
  if (id === "heidi") return HEIDI_ORDER;
  return LEVI_ORDER;
}

function resolvePerson(
  personId: PersonId,
  options?: GetMorningOverviewOptions,
): PersonProfile {
  if (options?.person) return options.person;
  const found = options?.data?.persons.find((p) => p.id === personId);
  if (!found) {
    throw new Error(
      `Unbekannte Person: ${personId} (person oder data.persons erforderlich)`,
    );
  }
  return found;
}

function resolveImportantHint(
  personId: PersonId,
  person: PersonProfile,
  importantTasks: MorningOverview["importantTasks"],
): string | null {
  if (personId === "birgit") {
    return person.hint?.trim() || null;
  }
  if (personId === "heidi") {
    const task = importantTasks[0]?.label?.trim();
    if (task) return task;
    return person.hint?.trim() || null;
  }
  return null;
}

function buildVisibility(
  personId: PersonId,
  overview: {
    itemsToTake: string[];
    bus: MorningOverview["bus"];
    weather: MorningOverview["weather"];
    appointments: MorningOverview["appointments"];
    importantTasks: MorningOverview["importantTasks"];
    coffee: MorningOverview["coffee"];
    workShift: MorningOverview["workShift"];
    importantHint: string | null;
  },
): MorningVisibility {
  const isBirgit = personId === "birgit";
  const isHeidi = personId === "heidi";

  return {
    nextActivity: !isBirgit,
    itemsToTake: !isBirgit && overview.itemsToTake.length > 0,
    bus: overview.bus.enabled,
    weather: overview.weather.weather !== null,
    appointments: !isBirgit && overview.appointments.length > 0,
    importantTasks: personId === "levi" && overview.importantTasks.length > 0,
    coffee: overview.coffee.enabled && personId === "levi",
    workShift: isBirgit || (isHeidi && overview.workShift !== null),
    hint: Boolean(overview.importantHint) && (isBirgit || isHeidi),
  };
}

/**
 * Central Smart Morning Engine — combines school/work, bus, weather,
 * calendar, tasks, bring list, and coffee into one structured result.
 *
 * UI should render this; business logic stays here.
 *
 * @example
 * getMorningOverview("levi", new Date("2026-09-14T07:00:00"))
 */
export function getMorningOverview(
  personId: PersonId,
  date: Date = new Date(),
  options?: GetMorningOverviewOptions,
): MorningOverview {
  const person = resolvePerson(personId, options);
  const focus = resolveFocusMoment(date);
  const dayView =
    options?.dayView ?? buildDayIntelligence(person, date);

  const scheduleBlocks =
    person.schedule.type === "work"
      ? blocksFromWorkShift(dayView.workShift)
      : blocksFromTimetable(dayView.timetable);

  const flowNow = focus.isTomorrowFocus
    ? new Date(
        focus.focusDate.getFullYear(),
        focus.focusDate.getMonth(),
        focus.focusDate.getDate(),
        5,
        0,
        0,
        0,
      )
    : date;

  const nextActivity = resolveNextActivity({
    scheduleBlocks,
    appointments: dayView.calendar,
    now: date,
    flowNow,
  });

  const appointments = filterRelevantAppointments(dayView.calendar, date, {
    focusIsTomorrow: dayView.focusIsTomorrow,
  });

  const busEnabled =
    options?.live?.busEnabled ??
    (person.transitPrefs?.enabled !== false &&
      Boolean(person.displayPrefs?.showBus !== false));

  const busInfo =
    options?.live?.bus !== undefined
      ? options.live.bus
      : dayView.nextBus;

  const bus = resolveBusMorning({
    enabled: busEnabled && Boolean(person.displayPrefs?.showBus !== false),
    bus: busEnabled ? busInfo : null,
    matchedToActivity: options?.live?.busMatched,
    isTestData: options?.live?.busIsTestData,
  });

  const weatherInfo =
    options?.live?.weather !== undefined
      ? options.live.weather
      : dayView.weather;

  const weather = {
    weather: person.displayPrefs?.showWeather === false ? null : weatherInfo,
    tip: weatherTipFrom(
      person.displayPrefs?.showWeather === false ? null : weatherInfo,
    ),
  };

  const coffee = resolveCoffeeMorning({
    preferredCoffee: person.personalSettings?.preferredCoffee,
    personId,
  });

  const greeting = personalizedGreeting(person.name, date);
  const importantTasks =
    person.displayPrefs?.showTasks === false ? [] : dayView.importantTasks;
  const importantHint = resolveImportantHint(
    personId,
    person,
    importantTasks,
  );

  const base = {
    personId,
    displayName: person.name,
    greeting,
    focusIsoDate: dayView.focusIsoDate,
    focusIsTomorrow: dayView.focusIsTomorrow,
    nextActivity,
    itemsToTake: dayView.mitnehmen,
    itemsToTakeEmptyMessage: EMPTY_BRING_MESSAGE,
    bus,
    weather,
    appointments,
    importantTasks,
    coffee,
    workShift: dayView.workShift,
    importantHint,
  };

  const visibility = buildVisibility(personId, base);

  const overviewWithoutSummary = {
    ...base,
    visibility,
    priorityOrder: priorityOrderFor(personId),
  };

  const summary = buildMorningSummary(overviewWithoutSummary);

  return {
    ...overviewWithoutSummary,
    summary,
  };
}

/**
 * Apply overview “Als Nächstes” onto an existing DayIntelligenceView
 * so dashboards keep using DayFlowHero without duplicating logic.
 */
export function applyOverviewToDayView(
  view: DayIntelligenceView,
  overview: MorningOverview,
  wallNow: Date,
): DayIntelligenceView {
  return {
    ...view,
    dayFlow: dayFlowFromNextActivity(overview.nextActivity, wallNow),
    mitnehmen: overview.itemsToTake,
    calendar: overview.appointments,
    importantTasks: overview.importantTasks,
    nextBus: overview.bus.bus,
    weather: overview.weather.weather ?? view.weather,
  };
}

export type { MorningOverview } from "@/lib/morning/types";
