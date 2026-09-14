import type { BusDeparture, BusInfo, BusStop } from "@/lib/types";
import { getMinutesSinceMidnight, parseTimeToMinutes } from "@/lib/format";

export type LiveDeparture = {
  line: string;
  destination: string;
  /**
   * HH:MM used for sorting / selection.
   * Prefer realtime when known; otherwise planned timetable.
   */
  time: string;
  /** Absolute ms if known from live API */
  atMs?: number;
  /**
   * Estimated arrival at destination if the API provides it.
   * Never invent — leave undefined when unknown.
   */
  estimatedArrivalHHmm?: string;
  /** Planned timetable HH:MM when distinct from realtime. */
  scheduledTime?: string;
  /** Realtime HH:MM when the provider supplies it. */
  realtimeTime?: string;
  /** Delay minutes when reported — never invent. */
  delayMinutes?: number | null;
  cancelled?: boolean;
  isRealtime?: boolean;
};

/** Prefer realtime clock over timetable — never invent delay. */
export function effectiveDepartureHHmm(d: LiveDeparture): string {
  if (d.realtimeTime?.trim()) return d.realtimeTime.trim();
  return d.time;
}

export type SelectDepartureOptions = {
  targetStartHHMM?: string | null;
  leadTimeMinutes?: number;
  stopName: string;
  source?: BusInfo["source"];
  preferredLines?: string[];
  destinationHint?: string;
  /**
   * When true and preferredLines are set, never fall back to other lines.
   * Default false (prefer preferred lines, else any matching destination).
   */
  strictPreferredLine?: boolean;
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

export function matchesPreferredLines(
  d: LiveDeparture,
  preferredLines?: string[],
): boolean {
  if (!preferredLines?.length) return true;
  return preferredLines.some(
    (l) => l.trim().toLowerCase() === d.line.trim().toLowerCase(),
  );
}

export function matchesDestinationHint(
  d: LiveDeparture,
  destinationHint?: string,
): boolean {
  if (!destinationHint?.trim()) return true;
  const hint = destinationHint.trim().toLowerCase();
  const dest = d.destination.toLowerCase();
  return dest.includes(hint) || hint.includes(dest.slice(0, Math.min(8, dest.length)));
}

function buildPool(
  departures: LiveDeparture[],
  options?: SelectDepartureOptions,
): LiveDeparture[] {
  const byDestination = departures.filter((d) =>
    matchesDestinationHint(d, options?.destinationHint),
  );
  const destPool = byDestination.length ? byDestination : departures;

  if (!options?.preferredLines?.length) return destPool;

  const preferred = destPool.filter((d) =>
    matchesPreferredLines(d, options.preferredLines),
  );
  if (preferred.length) return preferred;
  if (options.strictPreferredLine) return [];
  return destPool;
}

/**
 * Intelligent bus choice for morning dashboards.
 *
 * - Cancelled departures excluded
 * - Realtime departure preferred over timetable when present
 * - Current time filters past departures
 * - Preferred line + destination hint when set
 * - Desired arrival / work start + lead time → latest departure that still fits
 * - estimatedArrivalHHmm used when API provides it — never invent travel time
 * - Heuristic without travel time: depart by (target − leadTime)
 * - Never invent delay minutes
 */
export function selectRelevantDeparture(
  departures: LiveDeparture[],
  now: Date,
  options?: SelectDepartureOptions,
): BusInfo | null {
  if (departures.length === 0) return null;
  const current = getMinutesSinceMidnight(now);
  const pool = buildPool(
    departures.filter((d) => !d.cancelled),
    options,
  );

  const withMinutes = pool
    .map((d) => {
      const effective = effectiveDepartureHHmm(d);
      return {
        ...d,
        time: effective,
        scheduledTime: d.scheduledTime ?? d.time,
        minutes: parseTimeToMinutes(effective),
      };
    })
    .filter((d) => d.minutes >= current)
    .sort((a, b) => a.minutes - b.minutes);

  if (withMinutes.length === 0) {
    // All remaining candidates cancelled → surface a cancelled sentinel
    const cancelledOnly = buildPool(
      departures.filter((d) => d.cancelled),
      options,
    );
    if (cancelledOnly.length > 0) {
      const c = cancelledOnly[0];
      return {
        line: c.line,
        destination: c.destination,
        departure: effectiveDepartureHHmm(c),
        stopName: options?.stopName ?? "",
        minutesUntil: 0,
        matchedToWork: false,
        arrivesInTime: null,
        cancelled: true,
        scheduledDeparture: c.scheduledTime ?? c.time,
        realtimeDeparture: c.realtimeTime,
        delayMinutes: c.delayMinutes ?? null,
        isRealtime: Boolean(c.isRealtime || c.realtimeTime),
        isTestData: options?.source === "local",
        source: options?.source ?? "local",
      };
    }
    return null;
  }

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
      // No reliable travel time — do not invent duration.
      // Use lead time as departure buffer before target.
      const latestUseful = target - lead;
      const suitable = withMinutes.filter((d) => d.minutes <= latestUseful);
      if (suitable.length > 0) {
        chosen = suitable[suitable.length - 1];
        matchedToWork = true;
        // Heuristic arrival-fit (buffer before target), not proven vehicle punctuality.
        arrivesInTime = true;
      } else {
        chosen = withMinutes[0];
        matchedToWork = false;
        arrivesInTime = false;
      }
    }
  }

  const isRealtime = Boolean(chosen.isRealtime || chosen.realtimeTime);
  const isTestData = options?.source === "local";

  return {
    line: chosen.line,
    destination: chosen.destination,
    departure: chosen.time,
    stopName: options?.stopName ?? "",
    minutesUntil: chosen.minutes - current,
    matchedToWork,
    arrivesInTime,
    scheduledDeparture: chosen.scheduledTime,
    realtimeDeparture: chosen.realtimeTime,
    delayMinutes:
      chosen.delayMinutes === undefined ? null : chosen.delayMinutes,
    cancelled: false,
    isRealtime,
    isTestData,
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

/** Friendly dashboard copy — never expose provider/API jargon to Birgit. */
export function friendlyBusEmptyMessage(input: {
  simple?: boolean;
  hasConfig: boolean;
  enabled?: boolean;
  offline?: boolean;
  unavailable?: boolean;
}): { title: string; description: string } {
  if (!input.hasConfig || input.enabled === false) {
    return {
      title: input.simple ? "Kein Bus nötig" : "Kein Bus nötig",
      description: input.simple
        ? "Heute bleibst du in der Nähe."
        : "Keine Haltestelle eingerichtet.",
    };
  }
  if (input.offline) {
    return {
      title: input.simple ? "Kein passender Bus" : "Offline",
      description: input.simple
        ? "Bitte später erneut prüfen."
        : "Offline — zuletzt gespeicherte Busdaten.",
    };
  }
  if (input.unavailable) {
    return {
      title: input.simple ? "Kein passender Bus" : "Busdaten nicht verfügbar",
      description: input.simple
        ? "Bitte später erneut prüfen."
        : "Busdaten gerade nicht verfügbar.",
    };
  }
  return {
    title: input.simple ? "Kein passender Bus" : "Keine passende Verbindung",
    description: input.simple
      ? "Bitte später erneut prüfen."
      : "Heute keine passende Verbindung gefunden.",
  };
}
