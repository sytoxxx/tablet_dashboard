import type { BusProvider, BusProviderResult, BusQuery } from "@/server/bus/types";
import type { LiveDeparture } from "@/lib/bus/select";

/**
 * Wiener Linien Open Government Realtime (Vienna only).
 * Docs: https://www.wienerlinien.at/ogd_realtime/
 * No API key required. Fair use: do not poll faster than ~15s.
 */
export class WienerLinienBusProvider implements BusProvider {
  readonly name = "wienerlinien";

  async getDepartures(query: BusQuery): Promise<BusProviderResult> {
    const rbl = query.externalId?.trim();
    if (!rbl || !/^\d+$/.test(rbl)) {
      return {
        stopName: query.stopName,
        departures: query.localDepartures,
        source: "local",
        provider: this.name,
        warning: "Keine gültige Haltestellen-ID — lokaler Plan.",
      };
    }

    const url = `https://www.wienerlinien.at/ogd_realtime/monitor?rbl=${encodeURIComponent(rbl)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as unknown;
      const departures = parseMonitor(json);
      const stopTitle = extractStopTitle(json) || query.stopName;

      if (departures.length === 0) {
        return {
          stopName: stopTitle,
          departures: query.localDepartures,
          source: departures.length ? "live" : "local",
          provider: this.name,
          warning:
            query.localDepartures.length > 0
              ? "Keine Live-Abfahrten — lokaler Plan."
              : "Keine Abfahrten gefunden.",
        };
      }

      return {
        stopName: stopTitle,
        departures,
        source: "live",
        provider: this.name,
      };
    } catch {
      return {
        stopName: query.stopName,
        departures: query.localDepartures,
        source: "local",
        provider: this.name,
        warning: "Live-Bus nicht erreichbar — lokaler Plan.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function extractStopTitle(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const data = (json as { data?: { monitors?: unknown[] } }).data;
  const monitors = data?.monitors;
  if (!Array.isArray(monitors) || !monitors[0] || typeof monitors[0] !== "object") {
    return null;
  }
  const stop = (monitors[0] as { locationStop?: { properties?: { title?: string } } })
    .locationStop;
  return stop?.properties?.title ?? null;
}

function parseMonitor(json: unknown): LiveDeparture[] {
  if (!json || typeof json !== "object") return [];
  const monitors = (json as { data?: { monitors?: unknown[] } }).data?.monitors;
  if (!Array.isArray(monitors)) return [];

  const out: LiveDeparture[] = [];

  for (const monitor of monitors) {
    if (!monitor || typeof monitor !== "object") continue;
    const lines = (monitor as { lines?: unknown[] }).lines;
    if (!Array.isArray(lines)) continue;
    for (const line of lines) {
      if (!line || typeof line !== "object") continue;
      const name = String((line as { name?: string }).name || "").slice(0, 12);
      const towards = String((line as { towards?: string }).towards || "").slice(0, 60);
      const deps = (line as { departures?: { departure?: unknown[] } }).departures
        ?.departure;
      if (!Array.isArray(deps)) continue;
      for (const dep of deps) {
        if (!dep || typeof dep !== "object") continue;
        const times = (dep as {
          departureTime?: { timeReal?: string; timePlanned?: string };
        }).departureTime;
        const iso = times?.timeReal || times?.timePlanned;
        if (!iso) continue;
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) continue;
        const hh = String(date.getHours()).padStart(2, "0");
        const mm = String(date.getMinutes()).padStart(2, "0");
        out.push({
          line: name || "?",
          destination: towards || "—",
          time: `${hh}:${mm}`,
          atMs: date.getTime(),
        });
      }
    }
  }

  out.sort((a, b) => (a.atMs ?? 0) - (b.atMs ?? 0));
  // Deduplicate identical line+time
  const seen = new Set<string>();
  return out.filter((d) => {
    const key = `${d.time}|${d.line}|${d.destination}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}
