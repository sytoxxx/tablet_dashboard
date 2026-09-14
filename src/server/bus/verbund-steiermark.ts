import type { BusProvider, BusProviderResult, BusQuery } from "@/server/bus/types";
import { parseTriasStopEvents } from "@/server/bus/trias/parse-stop-events";
import { buildTriasStopEventRequest } from "@/server/bus/trias/requests";

/**
 * Verkehrsverbund Steiermark — TRIAS OGD (StopEventRequest).
 *
 * Access: e-mail agreement to ogdtrias@verbundlinie.at → they send the URL.
 * Docs/FAQ: verbundlinie.at … FAQ zur OGD-Service-Schnittstelle TRIAS
 * Spec: VDV 431-1/431-2, Trias XSD 1.2
 *
 * Env:
 * - VERBUND_STEIERMARK_TRIAS_URL (required for live)
 * - VERBUND_STEIERMARK_REQUESTOR_REF (optional RequestorRef, default OpenService)
 *
 * Without URL → local fallback. Never invents departures or StopPointRefs.
 */
export class VerbundSteiermarkBusProvider implements BusProvider {
  readonly name = "verbund-steiermark";

  async getDepartures(query: BusQuery): Promise<BusProviderResult> {
    const endpoint = process.env.VERBUND_STEIERMARK_TRIAS_URL?.trim();
    const stopRef = query.externalId?.trim();
    const requestor =
      process.env.VERBUND_STEIERMARK_REQUESTOR_REF?.trim() || "OpenService";
    const fetchedAt = new Date().toISOString();

    if (!endpoint) {
      return {
        stopName: query.stopName,
        departures: query.localDepartures,
        source: "local",
        provider: this.name,
        isTestData: true,
        fetchedAt,
        warning:
          "Steiermark TRIAS nicht konfiguriert (VERBUND_STEIERMARK_TRIAS_URL) — lokale Testdaten.",
      };
    }

    if (!stopRef) {
      return {
        stopName: query.stopName,
        departures: query.localDepartures,
        source: "local",
        provider: this.name,
        isTestData: true,
        fetchedAt,
        warning: "Keine StopPointRef — lokale Testdaten.",
      };
    }

    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const body = buildTriasStopEventRequest({
      stopRef,
      requestor,
      depArrTime: nowIso,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "text/xml",
          Accept: "application/xml, text/xml, */*",
        },
        body,
        next: { revalidate: 0 },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const departures = parseTriasStopEvents(xml);
      const hasRealtime = departures.some((d) => d.isRealtime);

      if (departures.length === 0) {
        return {
          stopName: query.stopName,
          departures: query.localDepartures,
          source: "local",
          provider: this.name,
          isTestData: true,
          fetchedAt,
          warning:
            query.localDepartures.length > 0
              ? "Keine TRIAS-Abfahrten — lokale Testdaten."
              : "Keine Abfahrten gefunden.",
        };
      }

      return {
        stopName: query.stopName,
        departures,
        source: "live",
        provider: this.name,
        isTestData: false,
        fetchedAt,
        realtimeAt: hasRealtime ? fetchedAt : undefined,
      };
    } catch {
      return {
        stopName: query.stopName,
        departures: query.localDepartures,
        source: "local",
        provider: this.name,
        isTestData: true,
        fetchedAt,
        warning: "Steiermark TRIAS nicht erreichbar — lokale Testdaten.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function isSteiermarkConfigured(): boolean {
  return Boolean(process.env.VERBUND_STEIERMARK_TRIAS_URL?.trim());
}
