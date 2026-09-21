/**
 * Server-side trip travel planning for Heidi / Birgit via TRIAS TripRequest.
 * Not used for Levi (walking).
 *
 * Honesty rules:
 * - Never invent punctuality — compute against work start when known.
 * - Aim DepArrTime at the Vienna commute window (not “next overnight bus”).
 * - Surface cancelled primaries when TRIAS says so; usable next as alternative.
 * - Propagate isTestData from the fetch meta.
 */
import {
  appendConfiguredFinalWalk,
  findEarliestCancelledConnection,
  selectUpcomingConnections,
} from "@/lib/work/connections";
import type { TravelConnection } from "@/lib/work/travel-types";
import type {
  TravelPlan,
  TravelPlanStatus,
} from "@/lib/work/travel-planner";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";
import {
  getViennaMinutesSinceMidnight,
  minutesToHHmm,
  parseTimeToMinutes,
  viennaWallClockToUtcIso,
} from "@/lib/format";
import type { PersonId, PersonProfile } from "@/lib/types";
import { fetchTriasTrips } from "@/server/bus/trias/trip-service";
import type { BusInfo } from "@/lib/types";

export const HEIDI_ORIGIN_REF = "at:46:6005";
export const HEIDI_DEST_REF = "at:46:30537";
export const BIRGIT_ORIGIN_REF = "at:46:6005";
export const BIRGIT_TRANSIT_DEST_REF = "at:46:6056";
export const BIRGIT_END_DESTINATION_LABEL = "Pflegeverband Bruck/Mur";
export const BIRGIT_TRANSIT_STOP_LABEL = "Altersheimgasse";

/** Lead window before work start when aiming TripRequest DepArrTime. */
const COMMUTE_AIM_LEAD_MINUTES = 90;

function minutesUntilDeparture(
  departureHHmm: string | null,
  now: Date,
): number {
  if (!departureHHmm) return 0;
  return (
    parseTimeToMinutes(departureHHmm) - getViennaMinutesSinceMidnight(now)
  );
}

/**
 * Aim TRIAS DepArrTime at the commute window for workStart (Vienna wall).
 * If today's work start already passed, aim next calendar day.
 * Returns both the ISO aim and whether the window rolled to the next day.
 */
export function commuteDepArrTimeIso(
  now: Date,
  workStart: string | null,
): string {
  return resolveCommuteAim(now, workStart).depArrTimeIso;
}

export function resolveCommuteAim(
  now: Date,
  workStart: string | null,
): { depArrTimeIso: string; rolledToNextDay: boolean } {
  if (!workStart) {
    return {
      depArrTimeIso: now.toISOString().replace(/\.\d{3}Z$/, "Z"),
      rolledToNextDay: false,
    };
  }
  const workMin = parseTimeToMinutes(workStart);
  const nowMin = getViennaMinutesSinceMidnight(now);
  let day = now;
  let rolled = false;
  if (nowMin > workMin + 45) {
    day = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    rolled = true;
  }
  const aimMin = Math.max(0, workMin - COMMUTE_AIM_LEAD_MINUTES);
  return {
    depArrTimeIso: viennaWallClockToUtcIso(day, minutesToHHmm(aimMin)),
    rolledToNextDay: rolled,
  };
}

/**
 * Proven fit vs work start when arrival is known; otherwise null (unknown).
 * When the connection already appended a config final walk, arrival is at work.
 */
function computeArrivesInTime(
  connection: TravelConnection,
  workStart: string | null,
  stopToWorkMinutes: number,
  safetyBufferMinutes: number,
): boolean | null {
  if (!workStart || !connection.arrival) return null;
  const target = parseTimeToMinutes(workStart);
  const last = connection.legs[connection.legs.length - 1];
  const arrivalAlreadyAtWork = last?.timingSource === "config";
  const extraWalk = arrivalAlreadyAtWork
    ? 0
    : Math.max(0, stopToWorkMinutes);
  const arrival =
    parseTimeToMinutes(connection.arrival) +
    extraWalk +
    Math.max(0, safetyBufferMinutes);
  return arrival <= target;
}

function pickBestWorkConnection(
  connections: TravelConnection[],
  workStart: string | null,
  stopToWorkMinutes: number,
  safetyBufferMinutes: number,
): { primary: TravelConnection; alternative: TravelConnection | null } | null {
  if (!connections.length) return null;
  if (!workStart) {
    return {
      primary: connections[0]!,
      alternative: connections[1] ?? null,
    };
  }
  const fitting = connections.filter(
    (c) =>
      !c.cancelled &&
      computeArrivesInTime(
        c,
        workStart,
        stopToWorkMinutes,
        safetyBufferMinutes,
      ) === true,
  );
  if (!fitting.length) return null;
  const primary = fitting[fitting.length - 1]!;
  const alternative =
    fitting.find((c) => c !== primary) ??
    connections.find((c) => c !== primary && !c.cancelled) ??
    null;
  return { primary, alternative };
}

function busInfoFromConnection(
  connection: TravelConnection,
  meta: {
    now: Date;
    arrivesInTime: boolean | null;
    matchedToWork: boolean;
    isTestData: boolean;
  },
): BusInfo {
  const transit = connection.legs.find((l) => l.type === "TRANSIT");
  const delayed =
    typeof connection.delayMinutes === "number" && connection.delayMinutes > 0;
  return {
    line: transit?.line || connection.lineSummary || "?",
    destination: transit?.direction || connection.direction || "",
    departure: connection.departure || "",
    stopName: transit?.from || "Haltestelle",
    minutesUntil: minutesUntilDeparture(connection.departure, meta.now),
    realtimeDeparture: connection.realtime
      ? connection.departure || undefined
      : undefined,
    isRealtime: connection.realtime,
    delayMinutes: connection.delayMinutes ?? undefined,
    cancelled: connection.cancelled,
    status: connection.cancelled
      ? "CANCELLED"
      : connection.realtime
        ? delayed
          ? "DELAYED"
          : "REALTIME"
        : "PLANNED",
    arrivesInTime: meta.arrivesInTime,
    matchedToWork: meta.matchedToWork,
    isTestData: meta.isTestData,
    estimatedArrivalHHmm: connection.arrival ?? undefined,
  };
}

function messageForPlan(input: {
  cancelled: boolean;
  arrivesInTime: boolean | null;
  walkConfigured: boolean;
  delayed: boolean;
}): string {
  if (input.cancelled) return "Diese Verbindung fällt aus.";
  if (input.arrivesInTime === false) return "Ankunft reicht nicht rechtzeitig.";
  if (input.arrivesInTime === true) {
    if (!input.walkConfigured) {
      return "Gehzeit zur Haltestelle nicht konfiguriert — Losgehzeit = Abfahrt.";
    }
    return input.delayed
      ? "Verspätet, aber du kommst noch rechtzeitig."
      : "Du bist rechtzeitig";
  }
  if (!input.walkConfigured) {
    return "Gehzeit zur Haltestelle nicht konfiguriert — Losgehzeit = Abfahrt.";
  }
  return input.delayed
    ? "Verbindung mit Verspätung — Ankunftsfit unklar."
    : "Verbindung gefunden.";
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
    now: Date;
    forceCancelled?: boolean;
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

  const cancelled = meta.forceCancelled || connection.cancelled;
  const arrivesInTime = cancelled
    ? null
    : computeArrivesInTime(
        connection,
        meta.workStart,
        meta.stopToWorkMinutes,
        meta.safetyBufferMinutes,
      );
  const delayed =
    !cancelled &&
    typeof connection.delayMinutes === "number" &&
    connection.delayMinutes > 0;

  let status: TravelPlanStatus = "on-time";
  if (cancelled) status = "cancelled";
  else if (arrivesInTime === false) status = "no-connection";
  else status = "on-time";

  const matched = arrivesInTime === true;

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
    leaveHome: cancelled ? null : leaveHome,
    busDeparture: connection.departure,
    arrivalAtDestination: cancelled ? null : connection.arrival,
    arrivalAtWork: cancelled ? null : connection.arrival,
    preparationStart: cancelled ? null : prep,
    status,
    isTestData: meta.isTestData,
    matched,
    message: messageForPlan({
      cancelled,
      arrivesInTime,
      walkConfigured: connection.walkTimeConfigured,
      delayed,
    }),
    bus: busInfoFromConnection(connection, {
      now: meta.now,
      arrivesInTime,
      matchedToWork: matched,
      isTestData: meta.isTestData,
    }),
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

function cancelledPlanShell(meta: {
  destinationLabel: string;
  endDestinationLabel?: string | null;
  transitDestinationLabel?: string | null;
  workStart: string | null;
  workEnd: string | null;
  walkToStopMinutes: number;
  stopToWorkMinutes: number;
  preparationMinutes: number;
  safetyBufferMinutes: number;
  isTestData: boolean;
  cancelled: TravelConnection;
  alternative: TravelConnection | null;
  now: Date;
}): TravelPlan {
  const alt = meta.alternative;
  if (alt && !alt.cancelled) {
    const plan = planFromConnection(alt, {
      personId: "birgit",
      destinationLabel: meta.destinationLabel,
      endDestinationLabel: meta.endDestinationLabel,
      transitDestinationLabel: meta.transitDestinationLabel,
      workStart: meta.workStart,
      workEnd: meta.workEnd,
      walkToStopMinutes: alt.walkToStopMinutes,
      stopToWorkMinutes: meta.stopToWorkMinutes,
      preparationMinutes: meta.preparationMinutes,
      safetyBufferMinutes: meta.safetyBufferMinutes,
      isTestData: meta.isTestData,
      connections: [meta.cancelled, alt],
      alternative: alt,
      now: meta.now,
    });
    return {
      ...plan,
      status: "cancelled",
      message: "Diese Verbindung fällt aus.",
      bus: {
        ...busInfoFromConnection(meta.cancelled, {
          now: meta.now,
          arrivesInTime: null,
          matchedToWork: false,
          isTestData: meta.isTestData,
        }),
        cancelled: true,
        status: "CANCELLED",
      },
      leaveHome: alt.leaveHome,
      busDeparture: alt.departure,
      arrivalAtDestination: alt.arrival,
      arrivalAtWork: alt.arrival,
      legs: meta.cancelled.legs,
      connections: [meta.cancelled, alt],
      alternativeConnection: alt,
    };
  }

  return planFromConnection(meta.cancelled, {
    personId: "birgit",
    destinationLabel: meta.destinationLabel,
    endDestinationLabel: meta.endDestinationLabel,
    transitDestinationLabel: meta.transitDestinationLabel,
    workStart: meta.workStart,
    workEnd: meta.workEnd,
    walkToStopMinutes: meta.cancelled.walkToStopMinutes,
    stopToWorkMinutes: meta.stopToWorkMinutes,
    preparationMinutes: meta.preparationMinutes,
    safetyBufferMinutes: meta.safetyBufferMinutes,
    isTestData: meta.isTestData,
    connections: [meta.cancelled],
    alternative: null,
    now: meta.now,
    forceCancelled: true,
  });
}

export async function planHeidiTripTravel(
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
    person.busStop?.externalId?.trim() || HEIDI_ORIGIN_REF;
  const dest =
    person.transitPrefs?.destinationStop?.externalId?.trim() || HEIDI_DEST_REF;

  const result = await fetchTriasTrips({
    originRef: origin,
    destRef: dest,
    numberOfResults: 10,
    depArrTime: commuteDepArrTimeIso(now, workStart),
  });

  const walk =
    prefs.walkToStopMinutes === undefined || prefs.walkToStopMinutes === null
      ? null
      : prefs.walkToStopMinutes;

  const connections = selectUpcomingConnections(result.trips, {
    walkToStopMinutes: walk,
    now,
    limit: 6,
    preferDirect: true,
  });

  const earliestCancelled = findEarliestCancelledConnection(result.trips, {
    walkToStopMinutes: walk,
    now,
  });

  if (connections.length === 0) {
    if (earliestCancelled) {
      const plan = cancelledPlanShell({
        destinationLabel:
          prefs.destinationLabel ||
          prefs.destinationStop?.name ||
          "Apfelmoar Einkaufszentrum",
        workStart,
        workEnd,
        walkToStopMinutes: earliestCancelled.walkToStopMinutes,
        stopToWorkMinutes: prefs.stopToWorkMinutes ?? 0,
        preparationMinutes: prefs.preparationMinutes ?? 0,
        safetyBufferMinutes: prefs.safetyBufferMinutes ?? 5,
        isTestData: result.isTestData,
        cancelled: earliestCancelled,
        alternative: null,
        now,
      });
      return {
        plan,
        connections: [earliestCancelled],
        warning: result.warning,
        isTestData: result.isTestData,
        fetchedAt: result.fetchedAt,
      };
    }
    return {
      plan: null,
      connections: [],
      warning: result.warning || "Keine kommenden Verbindungen.",
      isTestData: result.isTestData,
      fetchedAt: result.fetchedAt,
    };
  }

  const picked = pickBestWorkConnection(
    connections,
    workStart,
    prefs.stopToWorkMinutes ?? 0,
    prefs.safetyBufferMinutes ?? 5,
  );

  const primary = picked?.primary ?? connections[0]!;
  if (
    earliestCancelled?.departure &&
    primary.departure &&
    parseTimeToMinutes(earliestCancelled.departure) <=
      parseTimeToMinutes(primary.departure)
  ) {
    const plan = cancelledPlanShell({
      destinationLabel:
        prefs.destinationLabel ||
        prefs.destinationStop?.name ||
        "Apfelmoar Einkaufszentrum",
      workStart,
      workEnd,
      walkToStopMinutes: earliestCancelled.walkToStopMinutes,
      stopToWorkMinutes: prefs.stopToWorkMinutes ?? 0,
      preparationMinutes: prefs.preparationMinutes ?? 0,
      safetyBufferMinutes: prefs.safetyBufferMinutes ?? 5,
      isTestData: result.isTestData,
      cancelled: earliestCancelled,
      alternative: primary,
      now,
    });
    return {
      plan,
      connections: [earliestCancelled, ...connections],
      warning: result.warning,
      isTestData: result.isTestData,
      fetchedAt: result.fetchedAt,
    };
  }

  const plan = planFromConnection(primary, {
    personId: "heidi",
    destinationLabel:
      prefs.destinationLabel ||
      prefs.destinationStop?.name ||
      "Apfelmoar Einkaufszentrum",
    workStart,
    workEnd,
    walkToStopMinutes: primary.walkToStopMinutes,
    stopToWorkMinutes: prefs.stopToWorkMinutes ?? 0,
    preparationMinutes: prefs.preparationMinutes ?? 0,
    safetyBufferMinutes: prefs.safetyBufferMinutes ?? 5,
    isTestData: result.isTestData,
    connections,
    alternative: picked?.alternative ?? null,
    now,
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
    numberOfResults: 10,
    depArrTime: commuteDepArrTimeIso(now, workStart),
  });

  const walk =
    prefs.walkToStopMinutes === undefined || prefs.walkToStopMinutes === null
      ? null
      : prefs.walkToStopMinutes;

  let connections = selectUpcomingConnections(result.trips, {
    walkToStopMinutes: walk,
    now,
    limit: 8,
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

  let earliestCancelled = findEarliestCancelledConnection(result.trips, {
    walkToStopMinutes: walk,
    now,
  });
  if (earliestCancelled) {
    earliestCancelled = appendConfiguredFinalWalk(earliestCancelled, {
      endDestinationLabel: endLabel,
      stopToWorkMinutes: stopToWork,
      transitStopLabel: transitLabel,
    });
  }

  if (connections.length === 0) {
    if (earliestCancelled) {
      const plan = cancelledPlanShell({
        destinationLabel: endLabel,
        endDestinationLabel: endLabel,
        transitDestinationLabel: transitLabel,
        workStart,
        workEnd,
        walkToStopMinutes: earliestCancelled.walkToStopMinutes,
        stopToWorkMinutes: stopToWork,
        preparationMinutes: prefs.preparationMinutes ?? 0,
        safetyBufferMinutes: prefs.safetyBufferMinutes ?? 5,
        isTestData: result.isTestData,
        cancelled: earliestCancelled,
        alternative: null,
        now,
      });
      return {
        plan,
        connections: [earliestCancelled],
        warning: result.warning,
        isTestData: result.isTestData,
        fetchedAt: result.fetchedAt,
      };
    }
    return {
      plan: null,
      connections: [],
      warning: result.warning || "Keine kommenden Verbindungen.",
      isTestData: result.isTestData,
      fetchedAt: result.fetchedAt,
    };
  }

  const safety = prefs.safetyBufferMinutes ?? 5;
  const picked = pickBestWorkConnection(
    connections,
    workStart,
    stopToWork,
    safety,
  );

  if (!picked && workStart) {
    const late = connections[0]!;
    const plan = planFromConnection(late, {
      personId: "birgit",
      destinationLabel: endLabel,
      endDestinationLabel: endLabel,
      transitDestinationLabel: transitLabel,
      workStart,
      workEnd,
      walkToStopMinutes: late.walkToStopMinutes,
      stopToWorkMinutes: stopToWork,
      preparationMinutes: prefs.preparationMinutes ?? 0,
      safetyBufferMinutes: safety,
      isTestData: result.isTestData,
      connections,
      now,
    });
    return {
      plan: {
        ...plan,
        status: "no-connection",
        matched: false,
        message: "Kein passender Bus für die Arbeitszeit.",
        leaveHome: null,
        busDeparture: null,
        arrivalAtDestination: null,
        arrivalAtWork: null,
      },
      connections,
      warning: result.warning,
      isTestData: result.isTestData,
      fetchedAt: result.fetchedAt,
    };
  }

  const primary = picked?.primary ?? connections[0]!;
  const alternative = picked?.alternative ?? null;

  if (
    earliestCancelled?.departure &&
    primary.departure &&
    parseTimeToMinutes(earliestCancelled.departure) <=
      parseTimeToMinutes(primary.departure)
  ) {
    const plan = cancelledPlanShell({
      destinationLabel: endLabel,
      endDestinationLabel: endLabel,
      transitDestinationLabel: transitLabel,
      workStart,
      workEnd,
      walkToStopMinutes: earliestCancelled.walkToStopMinutes,
      stopToWorkMinutes: stopToWork,
      preparationMinutes: prefs.preparationMinutes ?? 0,
      safetyBufferMinutes: safety,
      isTestData: result.isTestData,
      cancelled: earliestCancelled,
      alternative: primary,
      now,
    });
    return {
      plan,
      connections: [
        earliestCancelled,
        primary,
        ...(alternative ? [alternative] : []),
      ],
      warning: result.warning,
      isTestData: result.isTestData,
      fetchedAt: result.fetchedAt,
    };
  }

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
    safetyBufferMinutes: safety,
    isTestData: result.isTestData,
    connections: [primary, ...(alternative ? [alternative] : [])],
    alternative,
    now,
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
