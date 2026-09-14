import type { BusDeparture, BusInfo, BusStop } from "@/lib/types";
import { getMinutesSinceMidnight, parseTimeToMinutes } from "@/lib/format";

export type LiveDeparture = {
  line: string;
  destination: string;
  /** HH:MM local */
  time: string;
  /** Absolute ms if known */
  atMs?: number;
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

/**
 * Prefer a bus that arrives before (targetStart - leadTime).
 * If travel duration unknown, treat departure time as arrival estimate.
 * Falls back to wall-clock next departure when no suitable bus exists.
 */
export function selectRelevantDeparture(
  departures: LiveDeparture[],
  now: Date,
  options?: {
    targetStartHHMM?: string | null;
    leadTimeMinutes?: number;
    stopName: string;
    source?: BusInfo["source"];
  },
): BusInfo | null {
  if (departures.length === 0) return null;
  const current = getMinutesSinceMidnight(now);
  const withMinutes = departures
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

  if (target !== null) {
    const latestUseful = target - lead;
    const suitable = withMinutes.filter((d) => d.minutes <= latestUseful);
    if (suitable.length > 0) {
      chosen = suitable[suitable.length - 1];
      matchedToWork = true;
    }
  }

  return {
    line: chosen.line,
    destination: chosen.destination,
    departure: chosen.time,
    stopName: options?.stopName ?? "",
    minutesUntil: chosen.minutes - current,
    matchedToWork,
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
