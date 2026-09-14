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
import type { TravelPlan } from "@/lib/work/travel-planner";
import {
  planTravelForPerson,
  resolveTravelMode,
} from "@/lib/work/travel-planner";
import { buildMorningTimeline } from "@/lib/morning/timeline";
import {
  buildEveningPrep,
  isEveningPrepContext,
} from "@/lib/evening/prep";
import { toIsoDate } from "@/lib/day/tomorrow";

export type MorningOverviewLive = {
  /** Live/local bus overlay from useBusLive (optional). */
  bus?: BusInfo | null;
  weather?: WeatherInfo | null;
  busMatched?: boolean;
  busEnabled?: boolean;
  busIsTestData?: boolean;
  /** Bus/work travel plan from API (Birgit/Heidi). */
  travelPlan?: TravelPlan | null;
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
  "timeline",
  "nextActivity",
  "itemsToTake",
  "travel",
  "eveningPrep",
  "weather",
  "appointments",
  "importantTasks",
  "coffee",
];

const BIRGIT_ORDER: MorningSectionKey[] = [
  "timeline",
  "work",
  "travel",
  "eveningPrep",
  "weather",
  "hint",
];

/** Heidi: Timeline · Arbeit · Travel · Wetter · Termine */
const HEIDI_ORDER: MorningSectionKey[] = [
  "timeline",
  "work",
  "nextActivity",
  "travel",
  "eveningPrep",
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
    travelPlan: MorningOverview["travelPlan"];
    timeline: MorningOverview["timeline"];
    eveningPrep: MorningOverview["eveningPrep"];
    importantHint: string | null;
  },
  opts?: { eveningContext?: boolean },
): MorningVisibility {
  const isBirgit = personId === "birgit";
  const isHeidi = personId === "heidi";
  const evening = Boolean(opts?.eveningContext);

  return {
    nextActivity: !isBirgit && !evening,
    itemsToTake: !isBirgit && overview.itemsToTake.length > 0 && !evening,
    bus: overview.bus.enabled && !evening,
    weather: overview.weather.weather !== null,
    appointments: !isBirgit && overview.appointments.length > 0,
    importantTasks: personId === "levi" && overview.importantTasks.length > 0,
    coffee: overview.coffee.enabled && personId === "levi" && !evening,
    workShift: (isBirgit || isHeidi || overview.workShift !== null) && !evening,
    hint: Boolean(overview.importantHint) && (isBirgit || isHeidi),
    travelPlan:
      Boolean(overview.travelPlan?.applicable) &&
      overview.travelPlan?.status === "on-time" &&
      !evening,
    timeline: Boolean(overview.timeline && overview.timeline.state !== "idle") && !evening,
    eveningPrep: evening && Boolean(overview.eveningPrep),
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

  const travelMode = resolveTravelMode(personId, person.transitPrefs);
  // Walking school commute never uses bus selection for leave-time.
  const busForMorning =
    travelMode === "walking" ? null : busEnabled ? busInfo : null;

  const bus = resolveBusMorning({
    enabled:
      travelMode !== "walking" &&
      busEnabled &&
      Boolean(person.displayPrefs?.showBus !== false),
    bus: busForMorning,
    matchedToActivity: options?.live?.busMatched,
    isTestData: options?.live?.busIsTestData,
  });

  const travelPlan =
    options?.live?.travelPlan ??
    (travelMode === "walking"
      ? planTravelForPerson(person, date)
      : null);

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

  const resolvedTravel =
    travelPlan?.applicable && travelPlan.status !== "not-applicable"
      ? travelPlan
      : null;

  const timeline = buildMorningTimeline({
    personId,
    dateIso: toIsoDate(date),
    now: date,
    travel: resolvedTravel,
    bagItems: personId === "levi" ? dayView.mitnehmen : undefined,
    softHint: weather.tip,
  });

  const eveningContext =
    isEveningPrepContext(date) || dayView.focusIsTomorrow;
  const eveningPrep = eveningContext
    ? buildEveningPrep({
        person,
        now: date,
        weather: weather.weather,
        travelPlan: resolvedTravel,
      })
    : null;

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
    travelPlan: resolvedTravel,
    timeline: timeline.state === "idle" && !timeline.nextAction ? null : timeline,
    eveningPrep,
    importantHint,
  };

  const visibility = buildVisibility(personId, base, { eveningContext });

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
