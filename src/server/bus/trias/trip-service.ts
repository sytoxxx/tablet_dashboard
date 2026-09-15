import {
  TRIAS_DEFAULT_TIMEOUT_MS,
  TRIAS_REQUEST_HEADERS,
} from "@/server/bus/trias/http";
import {
  parseTriasTrips,
  type ParsedTrip,
} from "@/server/bus/trias/parse-trips";
import { buildTriasTripRequest } from "@/server/bus/trias/trip-request";

export type TriasTripQuery = {
  originRef: string;
  destRef: string;
  depArrTime?: string;
  numberOfResults?: number;
  timeoutMs?: number;
};

export type TriasTripFetchResult = {
  ok: boolean;
  trips: ParsedTrip[];
  isTestData: boolean;
  warning?: string;
  httpStatus?: number;
  fetchedAt: string;
};

/**
 * Server-side TRIAS TripRequest. Never logs XML or secrets.
 * Returns empty trips on error — callers must not invent routes.
 */
export async function fetchTriasTrips(
  query: TriasTripQuery,
): Promise<TriasTripFetchResult> {
  const fetchedAt = new Date().toISOString();
  const endpoint = process.env.VERBUND_STEIERMARK_TRIAS_URL?.trim();
  const originRef = query.originRef.trim();
  const destRef = query.destRef.trim();

  if (!endpoint) {
    return {
      ok: false,
      trips: [],
      isTestData: true,
      warning: "TRIAS URL nicht konfiguriert.",
      fetchedAt,
    };
  }
  if (!originRef || !destRef) {
    return {
      ok: false,
      trips: [],
      isTestData: true,
      warning: "Start- oder Ziel-StopPointRef fehlt.",
      fetchedAt,
    };
  }

  const requestor =
    process.env.VERBUND_STEIERMARK_REQUESTOR_REF?.trim() || "OpenService";
  const depArrTime =
    query.depArrTime ||
    new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const body = buildTriasTripRequest({
    originRef,
    destRef,
    requestor,
    depArrTime,
    numberOfResults: query.numberOfResults ?? 8,
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    query.timeoutMs ?? TRIAS_DEFAULT_TIMEOUT_MS,
  );

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { ...TRIAS_REQUEST_HEADERS },
      body,
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return {
        ok: false,
        trips: [],
        isTestData: true,
        warning: `TRIAS TripRequest HTTP ${res.status}`,
        httpStatus: res.status,
        fetchedAt,
      };
    }
    // Parse only — never return or log full XML.
    const xml = await res.text();
    const trips = parseTriasTrips(xml);
    return {
      ok: true,
      trips,
      isTestData: false,
      httpStatus: res.status,
      fetchedAt,
      warning:
        trips.length === 0 ? "Keine TRIAS-Verbindungen gefunden." : undefined,
    };
  } catch {
    return {
      ok: false,
      trips: [],
      isTestData: true,
      warning: "TRIAS TripRequest nicht erreichbar.",
      fetchedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function isTriasTripConfigured(): boolean {
  return Boolean(process.env.VERBUND_STEIERMARK_TRIAS_URL?.trim());
}
