import type { BusInfo, BusStop } from "@/lib/types";
import { getMinutesSinceMidnight, parseTimeToMinutes } from "@/lib/format";

/** Next departure at or after now — past times excluded. */
export function getNextBus(
  stop: BusStop | null,
  now: Date = new Date(),
): BusInfo | null {
  if (!stop || stop.departures.length === 0) return null;
  const current = getMinutesSinceMidnight(now);
  const upcoming = [...stop.departures]
    .map((d) => ({ ...d, minutes: parseTimeToMinutes(d.time) }))
    .filter((d) => d.minutes >= current)
    .sort((a, b) => a.minutes - b.minutes);

  const next = upcoming[0];
  if (!next) return null;

  return {
    line: next.line,
    destination: next.destination,
    departure: next.time,
    stopName: stop.name,
    minutesUntil: next.minutes - current,
  };
}
