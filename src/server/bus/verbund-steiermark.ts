import type { BusProvider, BusProviderResult, BusQuery } from "@/server/bus/types";
import type { LiveDeparture } from "@/lib/bus/select";

/**
 * Verkehrsverbund Steiermark — TRIAS OGD (StopEventRequest).
 *
 * Access: e-mail agreement to ogdtrias@verbundlinie.at → they send the URL.
 * Docs/FAQ: verbundlinie.at … FAQ zur OGD-Service-Schnittstelle TRIAS
 *
 * Env:
 * - VERBUND_STEIERMARK_TRIAS_URL (required for live)
 * - VERBUND_STEIERMARK_REQUESTOR_REF (optional RequestorRef, default OpenService)
 *
 * Without URL → local fallback. Never invents departures.
 */
export class VerbundSteiermarkBusProvider implements BusProvider {
  readonly name = "verbund-steiermark";

  async getDepartures(query: BusQuery): Promise<BusProviderResult> {
    const endpoint = process.env.VERBUND_STEIERMARK_TRIAS_URL?.trim();
    const stopRef = query.externalId?.trim();
    const requestor =
      process.env.VERBUND_STEIERMARK_REQUESTOR_REF?.trim() || "OpenService";

    if (!endpoint) {
      return {
        stopName: query.stopName,
        departures: query.localDepartures,
        source: "local",
        provider: this.name,
        isTestData: true,
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
        warning: "Keine StopPointRef — lokale Testdaten.",
      };
    }

    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const body = buildStopEventRequest({
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

      if (departures.length === 0) {
        return {
          stopName: query.stopName,
          departures: query.localDepartures,
          source: "local",
          provider: this.name,
          isTestData: true,
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
      };
    } catch {
      return {
        stopName: query.stopName,
        departures: query.localDepartures,
        source: "local",
        provider: this.name,
        isTestData: true,
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

function buildStopEventRequest(input: {
  stopRef: string;
  requestor: string;
  depArrTime: string;
}): string {
  const stopRef = escapeXml(input.stopRef);
  const requestor = escapeXml(input.requestor);
  const depArrTime = escapeXml(input.depArrTime);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Trias version="1.2" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri">
  <ServiceRequest>
    <siri:RequestTimestamp>${depArrTime}</siri:RequestTimestamp>
    <siri:RequestorRef>${requestor}</siri:RequestorRef>
    <RequestPayload>
      <StopEventRequest>
        <Location>
          <LocationRef>
            <StopPointRef>${stopRef}</StopPointRef>
          </LocationRef>
          <DepArrTime>${depArrTime}</DepArrTime>
        </Location>
        <Params>
          <NumberOfResults>12</NumberOfResults>
          <StopEventType>departure</StopEventType>
          <IncludeRealtimeData>true</IncludeRealtimeData>
        </Params>
      </StopEventRequest>
    </RequestPayload>
  </ServiceRequest>
</Trias>`;
}

function parseTriasStopEvents(xml: string): LiveDeparture[] {
  const out: LiveDeparture[] = [];
  // Lightweight tag scrape — enough for StopEventResult without XML lib.
  const results = xml.split(/<StopEventResult[\s>]/i).slice(1);
  for (const chunk of results) {
    const time =
      matchTag(chunk, "EstimatedTime") ||
      matchTag(chunk, "TimetabledTime") ||
      matchTag(chunk, "OperatingDayRef");
    const hhmm = time ? extractHHMM(time) : null;
    if (!hhmm) continue;
    const line =
      matchTag(chunk, "PublishedLineName") ||
      matchTag(chunk, "LineName") ||
      matchTag(chunk, "PublicCode") ||
      "?";
    const destination =
      matchTag(chunk, "DestinationText") ||
      matchTag(chunk, "DestinationName") ||
      matchTag(chunk, "DestinationStopName") ||
      "—";
    out.push({
      line: stripXml(line).slice(0, 16),
      destination: stripXml(destination).slice(0, 60),
      time: hhmm,
    });
  }
  return out.slice(0, 12);
}

function matchTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.trim() || null;
}

function extractHHMM(value: string): string | null {
  const m = value.match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : null;
}

function stripXml(value: string): string {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
