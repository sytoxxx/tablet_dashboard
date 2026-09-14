import type { BusDeparture, BusInfo, BusStop } from "@/lib/types";
import { getMinutesSinceMidnight, parseTimeToMinutes } from "@/lib/format";

export type LiveDeparture = {
  line: string;
  destination: string;
  /** HH:MM local */
  time: string;
  /** Absolute ms if known from live API */
  atMs?: number;
  /**
   * Estimated arrival at destination if the API provides it.
   * Never invent — leave undefined when unknown.
   */
  estimatedArrivalHHmm?: string;
};

/** Upcoming departures at/after now from a local stop schedule. */
export function listUpcomingFromStop(
  stop: BusStop | null,
  now: Date = new Date(),
): LiveDeparture[] {
  if (!stop || stop.departures.length === 0) return [];
  const current = getMinutesSinceMidnight(now);
  return [...stop.departures]
    .map((d) => ({
      line: d.line,
      destination: d.destination,
      time: d.time,
      minutes: parseTimeToMinutes(d.time),
    }))
    .filter((d) => d.minutes >= current)
    .sort((a, b) => a.minutes - b.minutes)
    .map(({ line, destination, time }) => ({ line, destination, time }));
}

/** Next departure at or after now — past times excluded. */
export function getNextBus(
  stop: BusStop | null,
  now: Date = new Date(),
): BusInfo | null {
  const upcoming = listUpcomingFromStop(stop, now);
  const next = upcoming[0];
  if (!next || !stop) return null;
  const current = getMinutesSinceMidnight(now);
  return {
    line: next.line,
    destination: next.destination,
    departure: next.time,
    stopName: stop.name,
    minutesUntil: parseTimeToMinutes(next.time) - current,
    source: "local",
  };
}

function matchesPreferredLines(
  d: LiveDeparture,
  preferredLines?: string[],
): boolean {
  if (!preferredLines?.length) return true;
  return preferredLines.some(
    (l) => l.trim().toLowerCase() === d.line.trim().toLowerCase(),
  );
}

function matchesDestinationHint(
  d: LiveDeparture,
  destinationHint?: string,
): boolean {
  if (!destinationHint?.trim()) return true;
  const hint = destinationHint.trim().toLowerCase();
  const dest = d.destination.toLowerCase();
  return dest.includes(hint) || hint.includes(dest.slice(0, Math.min(8, dest.length)));
}

/**
 * Intelligent bus choice for morning dashboards.
 *
 * - Prefer preferred line + destination hint when set
 * - If target arrival / work start + lead time: pick the latest departure that
 *   still leaves enough buffer (when API travel time is unknown)
 * - If estimatedArrivalHHmm exists: use it for on-time checks — never invent travel time
 * - Falls back to wall-clock next matching departure
 */
export function selectRelevantDeparture(
  departures: LiveDeparture[],
  now: Date,
  options?: {
    targetStartHHMM?: string | null;
    leadTimeMinutes?: number;
    stopName: string;
    source?: BusInfo["source"];
    preferredLines?: string[];
    destinationHint?: string;
  },
): BusInfo | null {
  if (departures.length === 0) return null;
  const current = getMinutesSinceMidnight(now);

  const filtered = departures.filter(
    (d) =>
      matchesPreferredLines(d, options?.preferredLines) &&
      matchesDestinationHint(d, options?.destinationHint),
  );
  const pool = filtered.length ? filtered : departures;

  const withMinutes = pool
    .map((d) => ({
      ...d,
      minutes: parseTimeToMinutes(d.time),
    }))
    .filter((d) => d.minutes >= current)
    .sort((a, b) => a.minutes - b.minutes);

  if (withMinutes.length === 0) return null;

  const lead = options?.leadTimeMinutes ?? 30;
  const target = options?.targetStartHHMM
    ? parseTimeToMinutes(options.targetStartHHMM)
    : null;

  let chosen = withMinutes[0];
  let matchedToWork = false;
  let arrivesInTime: boolean | null = null;

  if (target !== null) {
    const withKnownArrival = withMinutes.filter((d) => d.estimatedArrivalHHmm);
    if (withKnownArrival.length) {
      const onTime = withKnownArrival.filter((d) => {
        const arr = parseTimeToMinutes(d.estimatedArrivalHHmm!);
        return arr <= target - lead;
      });
      if (onTime.length) {
        chosen = onTime[onTime.length - 1];
        matchedToWork = true;
        arrivesInTime = true;
      } else {
        chosen = withMinutes[0];
        matchedToWork = false;
        arrivesInTime = false;
      }
    } else {
      // No reliable travel time from API — do not invent.
      // Heuristic: depart before (target - leadTime); pick the latest such bus.
      const latestUseful = target - lead;
      const suitable = withMinutes.filter((d) => d.minutes <= latestUseful);
      if (suitable.length > 0) {
        chosen = suitable[suitable.length - 1];
        matchedToWork = true;
        arrivesInTime = null;
      } else {
        chosen = withMinutes[0];
        matchedToWork = false;
        arrivesInTime = false;
      }
    }
  }

  return {
    line: chosen.line,
    destination: chosen.destination,
    departure: chosen.time,
    stopName: options?.stopName ?? "",
    minutesUntil: chosen.minutes - current,
    matchedToWork,
    arrivesInTime,
    source: options?.source ?? "local",
  };
}

export function departuresFromLocalStop(stop: BusStop): LiveDeparture[] {
  return stop.departures.map((d: BusDeparture) => ({
    line: d.line,
    destination: d.destination,
    time: d.time,
  }));
}
