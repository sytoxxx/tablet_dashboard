/**
 * Work-time bus planning for Birgit / Heidi.
 * Pure service — no React. Levi school path is not applicable.
 */
import {
  selectRelevantDeparture,
  type LiveDeparture,
  type SelectDepartureOptions,
} from "@/lib/bus/select";
import { minutesToHHmm, parseTimeToMinutes } from "@/lib/format";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";
import type { BusInfo, PersonId, TransitPrefs } from "@/lib/types";

export type WorkTravelPlanStatus =
  | "on-time"
  | "no-connection"
  | "cancelled"
  | "disabled"
  | "not-applicable";

export type WorkTravelPlan = {
  /** False for Levi / persons without work-travel planning. */
  applicable: boolean;
  workStart: string | null;
  workEnd: string | null;
  /** Leave home HH:MM (bus − walk to stop). */
  leaveHome: string | null;
  busDeparture: string | null;
  /** Arrival at workplace when stop arrival is known — never invented. */
  arrivalAtWork: string | null;
  /** “Ab HH:MM langsam fertig werden”. */
  preparationStart: string | null;
  status: WorkTravelPlanStatus;
  isTestData: boolean;
  matched: boolean;
  /** Short German line for the simple dashboard. */
  message: string;
  bus: BusInfo | null;
  walkToStopMinutes: number;
  stopToWorkMinutes: number;
  preparationMinutes: number;
  safetyBufferMinutes: number;
};

export function isWorkTravelPerson(personId: PersonId): boolean {
  return personId === "birgit" || personId === "heidi";
}

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
  /** When transit is disabled for the person. */
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
  };
}

function emptyPlan(
  partial: Partial<WorkTravelPlan> &
    Pick<WorkTravelPlan, "applicable" | "status" | "message">,
): WorkTravelPlan {
  return {
    workStart: null,
    workEnd: null,
    leaveHome: null,
    busDeparture: null,
    arrivalAtWork: null,
    preparationStart: null,
    isTestData: false,
    matched: false,
    bus: null,
    walkToStopMinutes: 0,
    stopToWorkMinutes: 0,
    preparationMinutes: 0,
    safetyBufferMinutes: 5,
    ...partial,
  };
}

/**
 * Pick the latest bus that still arrives on time (walk + buffer),
 * then derive leave-home and preparation start.
 */
export function planWorkTravel(input: PlanWorkTravelInput): WorkTravelPlan {
  const prefs = resolvePrefs(input.transitPrefs);

  if (!isWorkTravelPerson(input.personId)) {
    return emptyPlan({
      applicable: false,
      status: "not-applicable",
      message: "Keine arbeitsbezogene Busplanung.",
      walkToStopMinutes: prefs.walkToStopMinutes,
      stopToWorkMinutes: prefs.stopToWorkMinutes,
      preparationMinutes: prefs.preparationMinutes,
      safetyBufferMinutes: prefs.safetyBufferMinutes,
    });
  }

  if (input.enabled === false) {
    return emptyPlan({
      applicable: true,
      workStart: input.workStart,
      workEnd: input.workEnd ?? null,
      status: "disabled",
      message: "Heute bleibst du in der Nähe.",
      walkToStopMinutes: prefs.walkToStopMinutes,
      stopToWorkMinutes: prefs.stopToWorkMinutes,
      preparationMinutes: prefs.preparationMinutes,
      safetyBufferMinutes: prefs.safetyBufferMinutes,
    });
  }

  if (!input.workStart) {
    return emptyPlan({
      applicable: true,
      workEnd: input.workEnd ?? null,
      status: "no-connection",
      message: "Kein Arbeitstag — keine Busplanung.",
      isTestData: input.source === "local",
      walkToStopMinutes: prefs.walkToStopMinutes,
      stopToWorkMinutes: prefs.stopToWorkMinutes,
      preparationMinutes: prefs.preparationMinutes,
      safetyBufferMinutes: prefs.safetyBufferMinutes,
    });
  }

  const selectOpts: SelectDepartureOptions = {
    targetStartHHMM: input.workStart,
    leadTimeMinutes: prefs.leadTimeMinutes,
    stopName: input.stopName,
    source: input.source,
    preferredLines: input.preferredLines ?? prefs.preferredLines,
    destinationHint: input.destinationHint ?? prefs.destinationHint,
    workTravelMode: true,
    walkToStopMinutes: prefs.walkToStopMinutes,
    stopToWorkMinutes: prefs.stopToWorkMinutes,
    safetyBufferMinutes: prefs.safetyBufferMinutes,
    requireOnTime: true,
  };

  const bus = selectRelevantDeparture(input.departures, input.now, selectOpts);

  if (bus?.cancelled) {
    return emptyPlan({
      applicable: true,
      workStart: input.workStart,
      workEnd: input.workEnd ?? null,
      status: "cancelled",
      message: "Kein passender Bus",
      isTestData: Boolean(bus.isTestData) || input.source === "local",
      bus,
      walkToStopMinutes: prefs.walkToStopMinutes,
      stopToWorkMinutes: prefs.stopToWorkMinutes,
      preparationMinutes: prefs.preparationMinutes,
      safetyBufferMinutes: prefs.safetyBufferMinutes,
    });
  }

  if (!bus || bus.arrivesInTime !== true) {
    return emptyPlan({
      applicable: true,
      workStart: input.workStart,
      workEnd: input.workEnd ?? null,
      status: "no-connection",
      message: "Kein passender Bus",
      isTestData: input.source === "local" || Boolean(bus?.isTestData),
      // Do not present an unsuitable connection as the chosen bus.
      bus: null,
      walkToStopMinutes: prefs.walkToStopMinutes,
      stopToWorkMinutes: prefs.stopToWorkMinutes,
      preparationMinutes: prefs.preparationMinutes,
      safetyBufferMinutes: prefs.safetyBufferMinutes,
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
    workStart: input.workStart,
    workEnd: input.workEnd ?? null,
    leaveHome,
    busDeparture,
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
    walkToStopMinutes: prefs.walkToStopMinutes,
    stopToWorkMinutes: prefs.stopToWorkMinutes,
    preparationMinutes: prefs.preparationMinutes,
    safetyBufferMinutes: prefs.safetyBufferMinutes,
  };
}

/** Friendly prep line for the simple dashboard. */
export function preparationCopy(preparationStart: string | null): string | null {
  if (!preparationStart) return null;
  return `Ab ${preparationStart} langsam fertig werden`;
}
