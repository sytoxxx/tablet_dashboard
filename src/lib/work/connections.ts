/**
 * Convert parsed TRIAS trips into TravelConnection / TravelLeg domain models.
 * Pure — no fetch. Does not invent routes or footpaths from TRIAS.
 */
import { minutesToHHmm, parseTimeToMinutes } from "@/lib/format";
import type { TravelConnection, TravelLeg } from "@/lib/work/travel-types";
import {
  durationIsoToMinutes,
  isoToHHmm,
  preferIsoTime,
  tripArrivalIso,
  tripDelayMinutes,
  tripDepartureIso,
  tripHasCancelledLeg,
  tripHasRealtime,
  tripIsDirect,
  type ParsedTrip,
  type ParsedTripLeg,
} from "@/server/bus/trias/parse-trips";
import { delayMinutesFromTimes } from "@/server/bus/trias/xml";

function hhmmFromIso(iso: string | null): string | null {
  return isoToHHmm(iso);
}

function legFromParsed(leg: ParsedTripLeg): TravelLeg {
  const depIso = preferIsoTime(leg.depEstimatedIso, leg.depPlannedIso);
  const arrIso = preferIsoTime(leg.arrEstimatedIso, leg.arrPlannedIso);
  return {
    type: leg.type,
    departure: hhmmFromIso(depIso),
    arrival: hhmmFromIso(arrIso),
    from: leg.from,
    to: leg.to,
    fromRef: leg.fromRef,
    toRef: leg.toRef,
    line: leg.line,
    direction: leg.direction,
    delayMinutes:
      leg.type === "TRANSIT"
        ? delayMinutesFromTimes(leg.depPlannedIso, leg.depEstimatedIso)
        : null,
    cancelled: leg.cancelled,
    durationMinutes: durationIsoToMinutes(leg.durationIso),
    isRealtime: Boolean(leg.depEstimatedIso || leg.arrEstimatedIso),
    timingSource: "trias",
  };
}

export function computeLeaveHome(
  departureHHmm: string | null,
  walkToStopMinutes: number | null | undefined,
): { leaveHome: string | null; walkConfigured: boolean; walkMinutes: number } {
  if (walkToStopMinutes === null || walkToStopMinutes === undefined) {
    return {
      leaveHome: departureHHmm,
      walkConfigured: false,
      walkMinutes: 0,
    };
  }
  if (!departureHHmm) {
    return {
      leaveHome: null,
      walkConfigured: true,
      walkMinutes: walkToStopMinutes,
    };
  }
  return {
    leaveHome: minutesToHHmm(
      parseTimeToMinutes(departureHHmm) - walkToStopMinutes,
    ),
    walkConfigured: true,
    walkMinutes: walkToStopMinutes,
  };
}

function firstTransit(legs: TravelLeg[]): TravelLeg | null {
  return legs.find((l) => l.type === "TRANSIT") ?? null;
}

export function connectionFromParsedTrip(
  trip: ParsedTrip,
  options: {
    walkToStopMinutes?: number | null;
    now?: Date;
    /** When true, map cancelled trips instead of dropping them. */
    includeCancelled?: boolean;
  },
): TravelConnection | null {
  const cancelled = tripHasCancelledLeg(trip);
  if (cancelled && !options.includeCancelled) return null;

  const legs = trip.legs.map(legFromParsed);
  const depIso = tripDepartureIso(trip);
  const arrIso = tripArrivalIso(trip);
  const departure = hhmmFromIso(depIso);

  if (!departure) return null;

  if (options.now && depIso) {
    const depMs = Date.parse(depIso);
    if (Number.isFinite(depMs) && depMs < options.now.getTime() - 30_000) {
      return null;
    }
  }

  const { leaveHome, walkConfigured, walkMinutes } = computeLeaveHome(
    departure,
    options.walkToStopMinutes,
  );
  const transit = firstTransit(legs);
  let arrival = hhmmFromIso(arrIso);

  // Trailing TRIAS walk legs often lack arrival timestamps — extend from last known time.
  let cursor = arrival ? parseTimeToMinutes(arrival) : null;
  for (const leg of legs) {
    if (leg.type !== "WALK") {
      if (leg.arrival) cursor = parseTimeToMinutes(leg.arrival);
      continue;
    }
    if (!leg.arrival && cursor !== null && leg.durationMinutes != null) {
      cursor = cursor + leg.durationMinutes;
      leg.arrival = minutesToHHmm(cursor);
      if (!leg.departure && arrival) leg.departure = arrival;
      arrival = leg.arrival;
    } else if (leg.arrival) {
      cursor = parseTimeToMinutes(leg.arrival);
      arrival = leg.arrival;
    }
  }

  const duration =
    durationIsoToMinutes(trip.durationIso) ??
    (departure && arrival
      ? (() => {
          const d = parseTimeToMinutes(arrival) - parseTimeToMinutes(departure);
          return d >= 0 ? d : d + 24 * 60;
        })()
      : null);

  return {
    departure,
    arrival,
    leaveHome,
    durationMinutes: duration,
    realtime: tripHasRealtime(trip),
    cancelled,
    transfers: trip.interchanges,
    isDirect: tripIsDirect(trip),
    legs,
    lineSummary: transit?.line ?? null,
    direction: transit?.direction ?? null,
    delayMinutes: tripDelayMinutes(trip),
    walkToStopMinutes: walkMinutes,
    walkTimeConfigured: walkConfigured,
  };
}

/**
 * Earliest upcoming cancelled trip (if any), for honest cancel alerts.
 * Does not invent — only surfaces TRIAS-cancelled legs.
 */
export function findEarliestCancelledConnection(
  trips: ParsedTrip[],
  options: {
    walkToStopMinutes?: number | null;
    now: Date;
  },
): TravelConnection | null {
  const cancelled = trips
    .map((t) =>
      connectionFromParsedTrip(t, {
        walkToStopMinutes: options.walkToStopMinutes,
        now: options.now,
        includeCancelled: true,
      }),
    )
    .filter((c): c is TravelConnection => Boolean(c?.cancelled));

  cancelled.sort((a, b) => {
    const ta = parseTimeToMinutes(a.departure || "99:99");
    const tb = parseTimeToMinutes(b.departure || "99:99");
    return ta - tb;
  });

  return cancelled[0] ?? null;
}

/**
 * Upcoming connections: skip cancelled + past, sort by departure, prefer direct on ties.
 */
export function selectUpcomingConnections(
  trips: ParsedTrip[],
  options: {
    walkToStopMinutes?: number | null;
    now: Date;
    limit: number;
    preferDirect?: boolean;
  },
): TravelConnection[] {
  const mapped = trips
    .map((t) =>
      connectionFromParsedTrip(t, {
        walkToStopMinutes: options.walkToStopMinutes,
        now: options.now,
      }),
    )
    .filter((c): c is TravelConnection => Boolean(c));

  mapped.sort((a, b) => {
    const ta = parseTimeToMinutes(a.departure || "99:99");
    const tb = parseTimeToMinutes(b.departure || "99:99");
    if (ta !== tb) return ta - tb;
    if (options.preferDirect !== false && a.isDirect !== b.isDirect) {
      return a.isDirect ? -1 : 1;
    }
    return 0;
  });

  return mapped.slice(0, options.limit);
}

/**
 * Append a configured final walk after the last TRIAS stop.
 * Only when stopToWorkMinutes > 0 — not an invented TRIAS footpath.
 */
export function appendConfiguredFinalWalk(
  connection: TravelConnection,
  options: {
    endDestinationLabel: string;
    stopToWorkMinutes: number;
    transitStopLabel?: string | null;
  },
): TravelConnection {
  if (options.stopToWorkMinutes <= 0) return connection;

  const last = connection.legs[connection.legs.length - 1];
  const from = options.transitStopLabel || last?.to || "Haltestelle";
  const startMin = connection.arrival
    ? parseTimeToMinutes(connection.arrival)
    : null;
  const walkArrival =
    startMin !== null
      ? minutesToHHmm(startMin + options.stopToWorkMinutes)
      : null;

  const walkLeg: TravelLeg = {
    type: "WALK",
    departure: connection.arrival,
    arrival: walkArrival,
    from,
    to: options.endDestinationLabel,
    line: null,
    direction: null,
    delayMinutes: null,
    cancelled: false,
    durationMinutes: options.stopToWorkMinutes,
    isRealtime: false,
    timingSource: "config",
  };

  return {
    ...connection,
    arrival: walkArrival ?? connection.arrival,
    durationMinutes:
      connection.durationMinutes !== null
        ? connection.durationMinutes + options.stopToWorkMinutes
        : options.stopToWorkMinutes,
    legs: [...connection.legs, walkLeg],
  };
}
