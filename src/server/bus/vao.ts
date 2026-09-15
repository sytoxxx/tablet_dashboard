import type { BusProvider, BusProviderResult, BusQuery } from "@/server/bus/types";
import type { LiveDeparture } from "@/lib/bus/select";

/**
 * VAO START — Austria-wide REST API (arrival/departure boards).
 *
 * Access requires a personal VAO-Start key after signed contract
 * (start@verkehrsauskunft.at). No credentials are invented here.
 *
 * Env:
 * - VAO_API_KEY (required for live)
 * - VAO_BASE_URL (required for live; provided with the key / docs)
 *
 * Without key/URL → graceful local fallback (never invents departures).
 *
 * Request shape follows common VAO ReST board endpoints
 * (`departureBoard` / `arrivalBoard` + accessId). Exact host comes from VAO.
 */
export class VaoBusProvider implements BusProvider {
  readonly name = "vao";

  async getDepartures(query: BusQuery): Promise<BusProviderResult> {
    const apiKey = process.env.VAO_API_KEY?.trim();
    const baseUrl = process.env.VAO_BASE_URL?.trim()?.replace(/\/$/, "");
    const stopId = query.externalId?.trim();

    if (!apiKey || !baseUrl) {
      return {
        stopName: query.stopName,
        departures: query.localDepartures,
        source: "local",
        provider: this.name,
        isTestData: true,
        warning:
          "VAO START nicht konfiguriert (VAO_API_KEY / VAO_BASE_URL) — lokale Testdaten.",
      };
    }

    if (!stopId) {
      return {
        stopName: query.stopName,
        departures: query.localDepartures,
        source: "local",
        provider: this.name,
        isTestData: true,
        warning: "Keine VAO-Haltestellen-ID — lokale Testdaten.",
      };
    }

    const url = new URL(`${baseUrl}/departureBoard`);
    url.searchParams.set("id", stopId);
    url.searchParams.set("accessId", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("maxJourneys", "12");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as unknown;
      const departures = parseVaoBoard(json);

      if (departures.length === 0) {
        return {
          stopName: query.stopName,
          departures: query.localDepartures,
          source: "local",
          provider: this.name,
          isTestData: true,
          warning:
            query.localDepartures.length > 0
              ? "Keine VAO-Abfahrten — lokale Testdaten."
              : "Keine Abfahrten gefunden.",
        };
      }

      return {
        stopName: query.stopName,
        departures,
        source: "live",
        provider: this.name,
        isTestData: false,
      };
    } catch {
      return {
        stopName: query.stopName,
        departures: query.localDepartures,
        source: "local",
        provider: this.name,
        isTestData: true,
        warning: "VAO nicht erreichbar — lokale Testdaten.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function isVaoConfigured(): boolean {
  return Boolean(process.env.VAO_API_KEY?.trim() && process.env.VAO_BASE_URL?.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseVaoBoard(json: unknown): LiveDeparture[] {
  if (!json || typeof json !== "object") return [];
  const root = json as Record<string, unknown>;
  const list =
    (Array.isArray(root.Departure) && root.Departure) ||
    (Array.isArray(root.departure) && root.departure) ||
    (Array.isArray(root.Arrival) && root.Arrival) ||
    (Array.isArray((root.DepartureBoard as { Departure?: unknown })?.Departure) &&
      (root.DepartureBoard as { Departure: unknown[] }).Departure) ||
    [];

  const out: LiveDeparture[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const timeRaw =
      String(row.rtTime || row.time || row.Time || "").trim() ||
      extractTimeFromDateTime(String(row.rtDateTime || row.dateTime || ""));
    if (!timeRaw) continue;
    const time = normalizeHHMM(timeRaw);
    if (!time) continue;
    const line = String(
      row.name ||
        (isRecord(row.ProductAtStop) ? row.ProductAtStop.name : undefined) ||
        (isRecord(row.product) ? row.product.name : undefined) ||
        row.line ||
        "?",
    ).slice(0, 16);
    const destination = String(
      row.direction || row.Destination || row.directionText || "—",
    ).slice(0, 60);
    out.push({ line, destination, time });
  }
  return out.slice(0, 12);
}

function extractTimeFromDateTime(value: string): string {
  const m = value.match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
}

function normalizeHHMM(value: string): string | null {
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
