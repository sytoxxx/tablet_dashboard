/**
 * "Nächste Busse" for Heidi: the next real departures on her configured route,
 * counted from NOW — deliberately separate from "the bus that fits your shift"
 * (which aims TRIAS at the work start). Never depends on the work plan, the
 * daypart or whether she is free.
 *
 * Honesty rules:
 * - Live TRIAS data only. If it cannot be fetched the status is "unavailable"
 *   with a plain message — local/seed timetable rows are never presented as
 *   connections in production.
 * - Every row carries its absolute departure instant, so midnight and
 *   "tomorrow's first bus" are handled on real dates, not clock strings.
 * - Cancelled departures stay in the list, marked as cancelled.
 */
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";
import { viennaWallClockToUtcIso } from "@/lib/format";
import { departuresFromLocalStop } from "@/lib/bus/select";
import type { PersonProfile } from "@/lib/types";
import {
  isoToHHmm,
  tripDelayMinutes,
  tripDepartureIso,
  tripHasCancelledLeg,
  tripHasRealtime,
  tripIsDirect,
  type ParsedTrip,
} from "@/server/bus/trias/parse-trips";
import {
  fetchTriasTrips,
  isTriasTripConfigured,
  type TriasTripFetchResult,
} from "@/server/bus/trias/trip-service";
import { HEIDI_DEST_REF, HEIDI_ORIGIN_REF } from "@/server/bus/trip-travel";

export type NextDepartureRow = {
  /** Vienna wall-clock HH:MM. */
  time: string;
  /** Absolute departure instant. */
  iso: string;
  line: string;
  destination: string;
  delayMinutes: number | null;
  cancelled: boolean;
  realtime: boolean;
};

export type NextDepartures = {
  /** live = real TRIAS data · unavailable = could not be fetched · test = local sample rows (development only). */
  status: "live" | "unavailable" | "test";
  rows: NextDepartureRow[];
  message: string | null;
  fetchedAt: string;
};

const GRACE_MS = 30_000;
/** Enough rows that cancelled/duplicate trips cannot starve the list of 3 running buses. */
const REQUEST_RESULTS = 12;

export const UNAVAILABLE_MESSAGE = "Busdaten momentan nicht verfügbar";

/** Pure: parsed TRIAS trips -> chronological, deduplicated rows (cancelled included, past excluded). */
export function buildNextDepartureRows(trips: ParsedTrip[], now: Date): NextDepartureRow[] {
  const rows: Array<NextDepartureRow & { direct: boolean }> = [];
  for (const trip of trips) {
    const iso = tripDepartureIso(trip);
    const ms = iso ? Date.parse(iso) : NaN;
    if (!iso || !Number.isFinite(ms) || ms < now.getTime() - GRACE_MS) continue;
    const transit = trip.legs.find((l) => l.type === "TRANSIT");
    if (!transit) continue;
    const time = isoToHHmm(iso);
    if (!time) continue;
    rows.push({
      time,
      iso: new Date(ms).toISOString(),
      line: transit.line?.trim() || "?",
      destination: transit.direction?.trim() || transit.to?.trim() || "",
      delayMinutes: tripDelayMinutes(trip),
      cancelled: tripHasCancelledLeg(trip),
      realtime: tripHasRealtime(trip),
      direct: tripIsDirect(trip),
    });
  }

  // A trip with a transfer is not "the bus on her route" — only fall back to
  // those when there is no direct connection at all.
  const pool = rows.some((r) => r.direct) ? rows.filter((r) => r.direct) : rows;
  pool.sort((a, b) => Date.parse(a.iso) - Date.parse(b.iso));

  const seen = new Set<string>();
  const out: NextDepartureRow[] = [];
  for (const { direct, ...row } of pool) {
    void direct;
    const key = `${row.iso}|${row.line}|${row.destination}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

type Deps = {
  isConfigured: () => boolean;
  fetchTrips: typeof fetchTriasTrips;
  /** True in production builds: local/test rows must never be shown there. */
  production: boolean;
};

const DEFAULT_DEPS: Deps = {
  isConfigured: isTriasTripConfigured,
  fetchTrips: fetchTriasTrips,
  production: process.env.NODE_ENV === "production",
};

export async function fetchNextDepartures(
  person: PersonProfile,
  now: Date,
  deps: Deps = DEFAULT_DEPS,
): Promise<NextDepartures> {
  const fetchedAt = new Date().toISOString();

  if (!deps.isConfigured()) {
    if (deps.production) {
      return { status: "unavailable", rows: [], message: UNAVAILABLE_MESSAGE, fetchedAt };
    }
    // Development: show the local sample timetable, loudly labelled as test data.
    const rows: NextDepartureRow[] = (person.busStop ? departuresFromLocalStop(person.busStop) : [])
      .filter((d) => /^\d{1,2}:\d{2}$/.test(d.time))
      .map((d) => ({
        time: d.time,
        iso: viennaWallClockToUtcIso(now, d.time),
        line: d.line,
        destination: d.destination,
        delayMinutes: null,
        cancelled: false,
        realtime: false,
      }))
      .filter((r) => Date.parse(r.iso) >= now.getTime() - GRACE_MS);
    return { status: "test", rows, message: "Testdaten — kein Live-Zugang eingerichtet", fetchedAt };
  }

  const prefs = { ...DEFAULT_TRANSIT_PREFS, ...person.transitPrefs };
  const origin = person.busStop?.externalId?.trim() || HEIDI_ORIGIN_REF;
  const dest = prefs.destinationStop?.externalId?.trim() || HEIDI_DEST_REF;

  let result: TriasTripFetchResult;
  try {
    result = await deps.fetchTrips({
      originRef: origin,
      destRef: dest,
      numberOfResults: REQUEST_RESULTS,
      depArrTime: now.toISOString().replace(/\.\d{3}Z$/, "Z"),
    });
  } catch {
    return { status: "unavailable", rows: [], message: UNAVAILABLE_MESSAGE, fetchedAt };
  }

  if (!result.ok) {
    return { status: "unavailable", rows: [], message: UNAVAILABLE_MESSAGE, fetchedAt: result.fetchedAt };
  }
  return {
    status: "live",
    rows: buildNextDepartureRows(result.trips, now),
    message: null,
    fetchedAt: result.fetchedAt,
  };
}
