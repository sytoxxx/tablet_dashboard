/**
 * Shared morning travel planning for Levi, Birgit, and Heidi.
 *
 * Modes:
 * - walking — home → destination on foot (Levi → HTL); never selects a bus
 * - bus — home → stop → bus → stop → work (Birgit / Heidi)
 *
 * Pure service — no React. Leave-home and preparation are derived here.
 */
import {
  selectRelevantDeparture,
  type LiveDeparture,
  type SelectDepartureOptions,
} from "@/lib/bus/select";
import { minutesToHHmm, parseTimeToMinutes } from "@/lib/format";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";
import type { BusInfo, PersonId, PersonProfile, TransitPrefs } from "@/lib/types";
import type { TravelConnection, TravelLeg } from "@/lib/work/travel-types";

export type { TravelConnection, TravelLeg } from "@/lib/work/travel-types";

export type TravelMode = "walking" | "bus";

export type TravelPlanStatus =
  | "on-time"
  | "no-connection"
  | "cancelled"
  | "disabled"
  | "not-applicable";

/** @deprecated Prefer TravelPlanStatus — kept for existing imports. */
export type WorkTravelPlanStatus = TravelPlanStatus;

export type TravelPlan = {
  applicable: boolean;
  mode: TravelMode | null;
  /** Destination label, e.g. “HTL Kapfenberg” or workplace. */
  destinationLabel: string | null;
  /**
   * True end destination for display (e.g. Pflegeverband).
   * May differ from the TRIAS transit stop (Altersheimgasse).
   */
  endDestinationLabel?: string | null;
  /** TRIAS transit / alight stop label when end destination is beyond it. */
  transitDestinationLabel?: string | null;
  /** Desired arrival HH:MM (window start / work start). */
  arrivalTarget: string | null;
  /** Optional window end HH:MM (e.g. 07:50). */
  arrivalTargetEnd: string | null;
  /** Work/school window aliases for existing UI. */
  workStart: string | null;
  workEnd: string | null;
  /** Leave home HH:MM. */
  leaveHome: string | null;
  /** Bus departure when mode === "bus"; always null for walking. */
  busDeparture: string | null;
  /** Arrival at destination when known (walking: target; bus: stop arrival + walk). */
  arrivalAtDestination: string | null;
  /** Alias of arrivalAtDestination for work dashboards. */
  arrivalAtWork: string | null;
  /** “Ab HH:MM langsam fertig werden”. */
  preparationStart: string | null;
  status: TravelPlanStatus;
  isTestData: boolean;
  matched: boolean;
  message: string;
  bus: BusInfo | null;
  /** Primary travel duration used for leave calc (walking minutes or walk-to-stop). */
  travelMinutes: number;
  walkToStopMinutes: number;
  stopToWorkMinutes: number;
  preparationMinutes: number;
  safetyBufferMinutes: number;
  /** Legs of the primary connection (multi-leg TRIAS journeys). */
  legs?: TravelLeg[];
  /** Heidi: next 3 connections; Birgit: primary (+ optional alternative). */
  connections?: TravelConnection[];
  /** Optional alternative journey (Birgit). */
  alternativeConnection?: TravelConnection | null;
};

/** @deprecated Prefer TravelPlan. */
export type WorkTravelPlan = TravelPlan;

export function resolveTravelMode(
  personId: PersonId,
  prefs?: TransitPrefs | null,
): TravelMode {
  if (prefs?.travelMode === "walking" || prefs?.travelMode === "bus") {
    return prefs.travelMode;
  }
  if (personId === "levi") return "walking";
  return "bus";
}

/** Birgit/Heidi bus work-travel (legacy helper). */
export function isWorkTravelPerson(personId: PersonId): boolean {
  return personId === "birgit" || personId === "heidi";
}

export function isTravelPlanPerson(personId: PersonId): boolean {
  return personId === "levi" || personId === "birgit" || personId === "heidi";
}

export type PlanTravelInput = {
  personId: PersonId;
  mode?: TravelMode;
  /** Arrival / work / school target HH:MM. */
  arrivalTarget: string | null;
  arrivalTargetEnd?: string | null;
  workEnd?: string | null;
  destinationLabel?: string | null;
  transitPrefs?: TransitPrefs | null;
  /** Required for bus mode; ignored for walking. */
  departures?: LiveDeparture[];
  now: Date;
  stopName?: string;
  source?: BusInfo["source"];
  preferredLines?: string[];
  destinationHint?: string;
  enabled?: boolean;
};

/** @deprecated Prefer PlanTravelInput — workStart maps to arrivalTarget. */
export type PlanWorkTravelInput = {
  personId: PersonId;
  workStart: string | null;
  workEnd?: string | null;
  transitPrefs?: TransitPrefs | null;
  departures: LiveDeparture[];
  now: Date;
  stopName: string;
  source?: BusInfo["source"];
  preferredLines?: string[];
  destinationHint?: string;
  enabled?: boolean;
};

function resolvePrefs(prefs?: TransitPrefs | null) {
  const merged = { ...DEFAULT_TRANSIT_PREFS, ...prefs };
  return {
    leadTimeMinutes: merged.leadTimeMinutes,
    walkToStopMinutes: merged.walkToStopMinutes ?? 0,
    stopToWorkMinutes: merged.stopToWorkMinutes ?? 0,
    preparationMinutes: merged.preparationMinutes ?? 0,
    safetyBufferMinutes: merged.safetyBufferMinutes ?? 5,
    preferredLines: merged.preferredLines,
    destinationHint: merged.destinationHint,
    destinationLabel:
      merged.destinationLabel?.trim() ||
      merged.destinationStop?.name?.trim() ||
      null,
    desiredArrivalEndHHmm: merged.desiredArrivalEndHHmm?.trim() || null,
  };
}

function emptyPlan(
  partial: Partial<TravelPlan> &
    Pick<TravelPlan, "applicable" | "status" | "message">,
): TravelPlan {
  return {
    mode: null,
    destinationLabel: null,
    arrivalTarget: null,
    arrivalTargetEnd: null,
    workStart: null,
    workEnd: null,
    leaveHome: null,
    busDeparture: null,
    arrivalAtDestination: null,
    arrivalAtWork: null,
    preparationStart: null,
    isTestData: false,
    matched: false,
    bus: null,
    travelMinutes: 0,
    walkToStopMinutes: 0,
    stopToWorkMinutes: 0,
    preparationMinutes: 0,
    safetyBufferMinutes: 5,
    legs: undefined,
    connections: undefined,
    alternativeConnection: undefined,
    endDestinationLabel: undefined,
    transitDestinationLabel: undefined,
    ...partial,
  };
}

function withPrefMeta(
  prefs: ReturnType<typeof resolvePrefs>,
  extra: Partial<TravelPlan> &
    Pick<TravelPlan, "applicable" | "status" | "message">,
): TravelPlan {
  return emptyPlan({
    walkToStopMinutes: prefs.walkToStopMinutes,
    stopToWorkMinutes: prefs.stopToWorkMinutes,
    preparationMinutes: prefs.preparationMinutes,
    safetyBufferMinutes: prefs.safetyBufferMinutes,
    travelMinutes: prefs.walkToStopMinutes,
    destinationLabel: prefs.destinationLabel,
    ...extra,
  });
}

/**
 * Walking leave time:
 * leave = arrivalTarget − walkMinutes − safetyBuffer
 * prep  = leave − preparationMinutes
 */
function planWalkingTravel(
  input: PlanTravelInput,
  prefs: ReturnType<typeof resolvePrefs>,
): TravelPlan {
  const walkMinutes = prefs.walkToStopMinutes;
  const arrivalTarget = input.arrivalTarget;
  const arrivalTargetEnd =
    input.arrivalTargetEnd ?? prefs.desiredArrivalEndHHmm;
  const destinationLabel =
    input.destinationLabel ?? prefs.destinationLabel ?? "Ziel";

  if (!arrivalTarget) {
    return withPrefMeta(prefs, {
      applicable: true,
      mode: "walking",
      destinationLabel,
      arrivalTargetEnd,
      status: "no-connection",
      message: "Keine Ankunftszeit hinterlegt.",
      travelMinutes: walkMinutes,
    });
  }

  const leaveHomeMinutes =
    parseTimeToMinutes(arrivalTarget) -
    walkMinutes -
    prefs.safetyBufferMinutes;
  const leaveHome = minutesToHHmm(leaveHomeMinutes);
  const preparationStart = minutesToHHmm(
    leaveHomeMinutes - prefs.preparationMinutes,
  );

  return {
    applicable: true,
    mode: "walking",
    destinationLabel,
    arrivalTarget,
    arrivalTargetEnd,
    workStart: arrivalTarget,
    workEnd: input.workEnd ?? null,
    leaveHome,
    busDeparture: null,
    arrivalAtDestination: arrivalTarget,
    arrivalAtWork: arrivalTarget,
    preparationStart,
    status: "on-time",
    isTestData: false,
    matched: true,
    message: "Du bist rechtzeitig",
    bus: null,
    travelMinutes: walkMinutes,
    walkToStopMinutes: walkMinutes,
    stopToWorkMinutes: 0,
    preparationMinutes: prefs.preparationMinutes,
    safetyBufferMinutes: prefs.safetyBufferMinutes,
  };
}

function planBusTravel(
  input: PlanTravelInput,
  prefs: ReturnType<typeof resolvePrefs>,
): TravelPlan {
  const workStart = input.arrivalTarget;
  const destinationLabel =
    input.destinationLabel ?? prefs.destinationLabel ?? null;

  if (input.enabled === false) {
    return withPrefMeta(prefs, {
      applicable: true,
      mode: "bus",
      destinationLabel,
      workStart,
      arrivalTarget: workStart,
      arrivalTargetEnd: input.arrivalTargetEnd ?? null,
      workEnd: input.workEnd ?? null,
      status: "disabled",
      message: "Heute bleibst du in der Nähe.",
    });
  }

  if (!workStart) {
    return withPrefMeta(prefs, {
      applicable: true,
      mode: "bus",
      destinationLabel,
      workEnd: input.workEnd ?? null,
      arrivalTargetEnd: input.arrivalTargetEnd ?? null,
      status: "no-connection",
      message: "Kein Arbeitstag — keine Busplanung.",
      isTestData: input.source === "local",
    });
  }

  const selectOpts: SelectDepartureOptions = {
    targetStartHHMM: workStart,
    leadTimeMinutes: prefs.leadTimeMinutes,
    stopName: input.stopName ?? "",
    source: input.source,
    preferredLines: input.preferredLines ?? prefs.preferredLines,
    destinationHint: input.destinationHint ?? prefs.destinationHint,
    workTravelMode: true,
    walkToStopMinutes: prefs.walkToStopMinutes,
    stopToWorkMinutes: prefs.stopToWorkMinutes,
    safetyBufferMinutes: prefs.safetyBufferMinutes,
    requireOnTime: true,
  };

  const bus = selectRelevantDeparture(
    input.departures ?? [],
    input.now,
    selectOpts,
  );

  if (bus?.cancelled) {
    return withPrefMeta(prefs, {
      applicable: true,
      mode: "bus",
      destinationLabel,
      workStart,
      arrivalTarget: workStart,
      arrivalTargetEnd: input.arrivalTargetEnd ?? null,
      workEnd: input.workEnd ?? null,
      status: "cancelled",
      message: "Kein passender Bus",
      isTestData: Boolean(bus.isTestData) || input.source === "local",
      bus,
    });
  }

  if (!bus || bus.arrivesInTime !== true) {
    return withPrefMeta(prefs, {
      applicable: true,
      mode: "bus",
      destinationLabel,
      workStart,
      arrivalTarget: workStart,
      arrivalTargetEnd: input.arrivalTargetEnd ?? null,
      workEnd: input.workEnd ?? null,
      status: "no-connection",
      message: "Kein passender Bus",
      isTestData: input.source === "local" || Boolean(bus?.isTestData),
      bus: null,
    });
  }

  const busDeparture = bus.realtimeDeparture || bus.departure;
  const leaveHomeMinutes =
    parseTimeToMinutes(busDeparture) - prefs.walkToStopMinutes;
  const leaveHome = minutesToHHmm(leaveHomeMinutes);
  const preparationStart = minutesToHHmm(
    leaveHomeMinutes - prefs.preparationMinutes,
  );

  const arrivalAtWork = bus.estimatedArrivalHHmm
    ? minutesToHHmm(
        parseTimeToMinutes(bus.estimatedArrivalHHmm) + prefs.stopToWorkMinutes,
      )
    : null;

  const isTestData =
    Boolean(bus.isTestData) ||
    input.source === "local" ||
    input.source === "cache";

  return {
    applicable: true,
    mode: "bus",
    destinationLabel,
    arrivalTarget: workStart,
    arrivalTargetEnd: input.arrivalTargetEnd ?? null,
    workStart,
    workEnd: input.workEnd ?? null,
    leaveHome,
    busDeparture,
    arrivalAtDestination: arrivalAtWork,
    arrivalAtWork,
    preparationStart,
    status: "on-time",
    isTestData,
    matched: true,
    message: "Du bist rechtzeitig",
    bus: {
      ...bus,
      matchedToWork: true,
      arrivesInTime: true,
      isTestData,
    },
    travelMinutes: prefs.walkToStopMinutes,
    walkToStopMinutes: prefs.walkToStopMinutes,
    stopToWorkMinutes: prefs.stopToWorkMinutes,
    preparationMinutes: prefs.preparationMinutes,
    safetyBufferMinutes: prefs.safetyBufferMinutes,
  };
}

/**
 * Central travel planner — walking or bus depending on mode / person.
 */
export function planTravel(input: PlanTravelInput): TravelPlan {
  const prefs = resolvePrefs(input.transitPrefs);
  const mode =
    input.mode ?? resolveTravelMode(input.personId, input.transitPrefs);

  if (!isTravelPlanPerson(input.personId)) {
    return withPrefMeta(prefs, {
      applicable: false,
      status: "not-applicable",
      message: "Keine Reiseplanung für diese Person.",
    });
  }

  if (mode === "walking") {
    return planWalkingTravel(input, prefs);
  }

  return planBusTravel(input, prefs);
}

/**
 * Bus work-travel entry point (Birgit / Heidi).
 * Levi walking school path must use planTravel({ mode: "walking" }).
 */
export function planWorkTravel(input: PlanWorkTravelInput): TravelPlan {
  const mode = resolveTravelMode(input.personId, input.transitPrefs);
  if (mode === "walking" || input.personId === "levi") {
    // Never run bus selection for walking / Levi school commute.
    return planTravel({
      personId: input.personId,
      mode: "walking",
      arrivalTarget: input.workStart,
      workEnd: input.workEnd,
      transitPrefs: input.transitPrefs,
      now: input.now,
      enabled: input.enabled,
    });
  }

  return planTravel({
    personId: input.personId,
    mode: "bus",
    arrivalTarget: input.workStart,
    workEnd: input.workEnd,
    transitPrefs: input.transitPrefs,
    departures: input.departures,
    now: input.now,
    stopName: input.stopName,
    source: input.source,
    preferredLines: input.preferredLines,
    destinationHint: input.destinationHint,
    enabled: input.enabled,
  });
}

/** Build a walking/school plan from a person profile (Levi). */
export function planTravelForPerson(
  person: PersonProfile,
  now: Date = new Date(),
  options?: {
    arrivalTarget?: string | null;
    departures?: LiveDeparture[];
    source?: BusInfo["source"];
  },
): TravelPlan {
  const prefs = { ...DEFAULT_TRANSIT_PREFS, ...person.transitPrefs };
  const mode = resolveTravelMode(person.id, prefs);

  const schoolStart =
    person.schedule.type === "school"
      ? person.schedule.week[
          (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[
            now.getDay()
          ]
        ]?.lessons?.[0]?.time
      : null;

  const arrivalTarget =
    options?.arrivalTarget ??
    prefs.desiredArrivalHHmm ??
    schoolStart ??
    null;

  return planTravel({
    personId: person.id,
    mode,
    arrivalTarget,
    arrivalTargetEnd: prefs.desiredArrivalEndHHmm ?? null,
    destinationLabel: prefs.destinationLabel ?? prefs.destinationStop?.name,
    transitPrefs: prefs,
    departures: options?.departures,
    now,
    stopName: person.busStop?.name,
    source: options?.source,
    preferredLines: prefs.preferredLines,
    destinationHint: prefs.destinationHint,
    enabled: prefs.enabled !== false,
  });
}

/** Friendly prep line for dashboards. */
export function preparationCopy(preparationStart: string | null): string | null {
  if (!preparationStart) return null;
  return `Ab ${preparationStart} langsam fertig werden`;
}

export function arrivalWindowCopy(
  start: string | null,
  end: string | null,
): string | null {
  if (!start) return null;
  if (end && end !== start) return `${start}–${end}`;
  return start;
}
