/**
 * Server-side trip travel planning for Heidi / Birgit via TRIAS TripRequest.
 * Not used for Levi (walking).
 */
import {
  appendConfiguredFinalWalk,
  selectUpcomingConnections,
} from "@/lib/work/connections";
import type { TravelConnection } from "@/lib/work/travel-types";
import type { TravelPlan } from "@/lib/work/travel-planner";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";
import { minutesToHHmm, parseTimeToMinutes } from "@/lib/format";
import type { PersonId, PersonProfile } from "@/lib/types";
import { fetchTriasTrips } from "@/server/bus/trias/trip-service";
import type { BusInfo } from "@/lib/types";

export const HEIDI_ORIGIN_REF = "at:46:6005";
export const HEIDI_DEST_REF = "at:46:30537";
export const BIRGIT_ORIGIN_REF = "at:46:6005";
export const BIRGIT_TRANSIT_DEST_REF = "at:46:6056";
export const BIRGIT_END_DESTINATION_LABEL = "Pflegeverband Bruck/Mur";
export const BIRGIT_TRANSIT_STOP_LABEL = "Altersheimgasse";

function busInfoFromConnection(connection: TravelConnection): BusInfo {
  const transit = connection.legs.find((l) => l.type === "TRANSIT");
  return {
    line: transit?.line || connection.lineSummary || "?",
    destination: transit?.direction || connection.direction || "",
    departure: connection.departure || "",
    stopName: transit?.from || "Haltestelle",
    minutesUntil: 0,
    realtimeDeparture: connection.realtime
      ? connection.departure || undefined
      : undefined,
    isRealtime: connection.realtime,
    delayMinutes: connection.delayMinutes ?? undefined,
    cancelled: connection.cancelled,
    status: connection.cancelled
      ? "CANCELLED"
      : connection.realtime
        ? connection.delayMinutes && connection.delayMinutes > 0
          ? "DELAYED"
          : "REALTIME"
        : "PLANNED",
    arrivesInTime: true,
    matchedToWork: true,
    isTestData: false,
    estimatedArrivalHHmm: connection.arrival ?? undefined,
  };
}

function planFromConnection(
  connection: TravelConnection,
  meta: {
    personId: PersonId;
    destinationLabel: string;
    workStart: string | null;
    workEnd: string | null;
    arrivalTargetEnd?: string | null;
    walkToStopMinutes: number;
    stopToWorkMinutes: number;
    preparationMinutes: number;
    safetyBufferMinutes: number;
    isTestData: boolean;
    connections?: TravelConnection[];
    alternative?: TravelConnection | null;
    endDestinationLabel?: string | null;
    transitDestinationLabel?: string | null;
  },
): TravelPlan {
  const leaveHome = connection.leaveHome;
  const prep =
    leaveHome && meta.preparationMinutes > 0
      ? minutesToHHmm(
          parseTimeToMinutes(leaveHome) - meta.preparationMinutes,
        )
      : leaveHome
        ? minutesToHHmm(parseTimeToMinutes(leaveHome) - meta.preparationMinutes)
        : null;

  return {
    applicable: true,
    mode: "bus",
    destinationLabel: meta.destinationLabel,
    endDestinationLabel: meta.endDestinationLabel ?? meta.destinationLabel,
    transitDestinationLabel: meta.transitDestinationLabel ?? null,
    arrivalTarget: meta.workStart,
    arrivalTargetEnd: meta.arrivalTargetEnd ?? null,
    workStart: meta.workStart,
    workEnd: meta.workEnd,
    leaveHome,
    busDeparture: connection.departure,
    arrivalAtDestination: connection.arrival,
    arrivalAtWork: connection.arrival,
    preparationStart: prep,
    status: "on-time",
    isTestData: meta.isTestData,
    matched: true,
    message: connection.walkTimeConfigured
      ? "Du bist rechtzeitig"
      : "Gehzeit zur Haltestelle nicht konfiguriert — Losgehzeit = Abfahrt.",
    bus: busInfoFromConnection(connection),
    travelMinutes: meta.walkToStopMinutes,
    walkToStopMinutes: meta.walkToStopMinutes,
    stopToWorkMinutes: meta.stopToWorkMinutes,
    preparationMinutes: meta.preparationMinutes,
    safetyBufferMinutes: meta.safetyBufferMinutes,
    legs: connection.legs,
    connections: meta.connections,
    alternativeConnection: meta.alternative ?? null,
  };
}

export async function planHeidiTripTravel(
  person: PersonProfile,
  now: Date,
): Promise<{
  plan: TravelPlan | null;
  connections: TravelConnection[];
  warning?: string;
  isTestData: boolean;
  fetchedAt: string;
}> {
  const prefs = { ...DEFAULT_TRANSIT_PREFS, ...person.transitPrefs };
  const origin =
    person.busStop?.externalId?.trim() || HEIDI_ORIGIN_REF;
  const dest =
    person.transitPrefs?.destinationStop?.externalId?.trim() || HEIDI_DEST_REF;

  const result = await fetchTriasTrips({
    originRef: origin,
    destRef: dest,
    numberOfResults: 10,
  });

  const walk =
    prefs.walkToStopMinutes === undefined || prefs.walkToStopMinutes === null
      ? null
      : prefs.walkToStopMinutes;

  const connections = selectUpcomingConnections(result.trips, {
    walkToStopMinutes: walk,
    now,
    limit: 3,
    preferDirect: true,
  });

  if (connections.length === 0) {
    return {
      plan: null,
      connections: [],
      warning: result.warning || "Keine kommenden Verbindungen.",
      isTestData: result.isTestData,
      fetchedAt: result.fetchedAt,
    };
  }

  // Heidi: always show next connections, independent of work shift.
  const primary = connections[0];
  const plan = planFromConnection(primary, {
    personId: "heidi",
    destinationLabel:
      prefs.destinationLabel ||
      prefs.destinationStop?.name ||
      "Apfelmoar Einkaufszentrum",
    workStart: prefs.desiredArrivalHHmm ?? null,
    workEnd: null,
    walkToStopMinutes: primary.walkToStopMinutes,
    stopToWorkMinutes: prefs.stopToWorkMinutes ?? 0,
    preparationMinutes: prefs.preparationMinutes ?? 0,
    safetyBufferMinutes: prefs.safetyBufferMinutes ?? 5,
    isTestData: result.isTestData,
    connections,
  });

  return {
    plan,
    connections,
    warning: result.warning,
    isTestData: result.isTestData,
    fetchedAt: result.fetchedAt,
  };
}

export async function planBirgitTripTravel(
  person: PersonProfile,
  now: Date,
  workStart: string | null,
  workEnd: string | null,
): Promise<{
  plan: TravelPlan | null;
  connections: TravelConnection[];
  warning?: string;
  isTestData: boolean;
  fetchedAt: string;
}> {
  const prefs = { ...DEFAULT_TRANSIT_PREFS, ...person.transitPrefs };
  const origin =
    person.busStop?.externalId?.trim() || BIRGIT_ORIGIN_REF;
  // Transit stop (Altersheimgasse) — never treat as end destination label.
  const transitRef =
    person.transitPrefs?.destinationStop?.externalId?.trim() ||
    BIRGIT_TRANSIT_DEST_REF;
  const endLabel =
    prefs.destinationLabel?.trim() || BIRGIT_END_DESTINATION_LABEL;
  const transitLabel =
    prefs.destinationStop?.name?.trim() || BIRGIT_TRANSIT_STOP_LABEL;

  const result = await fetchTriasTrips({
    originRef: origin,
    destRef: transitRef,
    numberOfResults: 8,
  });

  const walk =
    prefs.walkToStopMinutes === undefined || prefs.walkToStopMinutes === null
      ? null
      : prefs.walkToStopMinutes;

  let connections = selectUpcomingConnections(result.trips, {
    walkToStopMinutes: walk,
    now,
    limit: 4,
    preferDirect: false,
  });

  const stopToWork = prefs.stopToWorkMinutes ?? 0;
  connections = connections.map((c) =>
    appendConfiguredFinalWalk(c, {
      endDestinationLabel: endLabel,
      stopToWorkMinutes: stopToWork,
      transitStopLabel: transitLabel,
    }),
  );

  if (connections.length === 0) {
    return {
      plan: null,
      connections: [],
      warning: result.warning || "Keine kommenden Verbindungen.",
      isTestData: result.isTestData,
      fetchedAt: result.fetchedAt,
    };
  }

  const primary = connections[0];
  const alternative =
    connections.find(
      (c) =>
        c.departure !== primary.departure ||
        c.lineSummary !== primary.lineSummary ||
        c.transfers !== primary.transfers,
    ) ?? null;

  const plan = planFromConnection(primary, {
    personId: "birgit",
    destinationLabel: endLabel,
    endDestinationLabel: endLabel,
    transitDestinationLabel: transitLabel,
    workStart,
    workEnd,
    walkToStopMinutes: primary.walkToStopMinutes,
    stopToWorkMinutes: stopToWork,
    preparationMinutes: prefs.preparationMinutes ?? 0,
    safetyBufferMinutes: prefs.safetyBufferMinutes ?? 5,
    isTestData: result.isTestData,
    connections: [primary, ...(alternative ? [alternative] : [])],
    alternative,
  });

  return {
    plan,
    connections: plan.connections ?? [primary],
    warning: result.warning,
    isTestData: result.isTestData,
    fetchedAt: result.fetchedAt,
  };
}

export function personUsesTripTravel(personId: PersonId): boolean {
  return personId === "heidi" || personId === "birgit";
}
