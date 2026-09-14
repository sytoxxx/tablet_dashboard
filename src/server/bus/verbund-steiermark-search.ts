import type { StopSearchHit } from "@/server/bus/types";

/**
 * TRIAS LocationInformationRequest — only called when VERBUND_STEIERMARK_TRIAS_URL is set.
 * Never invents stop IDs.
 */
export async function searchSteiermarkStops(query: string): Promise<StopSearchHit[]> {
  const endpoint = process.env.VERBUND_STEIERMARK_TRIAS_URL?.trim();
  if (!endpoint) return [];

  const requestor =
    process.env.VERBUND_STEIERMARK_REQUESTOR_REF?.trim() || "OpenService";
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const body = buildLocationInformationRequest({
    query,
    requestor,
    timestamp: nowIso,
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
    return parseLocationResults(xml);
  } finally {
    clearTimeout(timeout);
  }
}

function buildLocationInformationRequest(input: {
  query: string;
  requestor: string;
  timestamp: string;
}): string {
  const q = escapeXml(input.query);
  const requestor = escapeXml(input.requestor);
  const ts = escapeXml(input.timestamp);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Trias version="1.2" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri">
  <ServiceRequest>
    <siri:RequestTimestamp>${ts}</siri:RequestTimestamp>
    <siri:RequestorRef>${requestor}</siri:RequestorRef>
    <RequestPayload>
      <LocationInformationRequest>
        <InitialInput>
          <LocationName>${q}</LocationName>
        </InitialInput>
        <Restrictions>
          <Type>stop</Type>
          <NumberOfResults>12</NumberOfResults>
        </Restrictions>
      </LocationInformationRequest>
    </RequestPayload>
  </ServiceRequest>
</Trias>`;
}

function parseLocationResults(xml: string): StopSearchHit[] {
  const out: StopSearchHit[] = [];
  const chunks = xml.split(/<LocationResult[\s>]/i).slice(1);
  for (const chunk of chunks) {
    const id =
      matchTag(chunk, "StopPointRef") ||
      matchTag(chunk, "StopPlaceRef") ||
      matchTag(chunk, "LocationRef");
    const name =
      matchTag(chunk, "StopPointName") ||
      matchTag(chunk, "StopName") ||
      matchTag(chunk, "LocationName") ||
      matchTag(chunk, "Name");
    if (!id || !name) continue;
    const place =
      matchTag(chunk, "LocalityName") ||
      matchTag(chunk, "MunicipalityName") ||
      matchTag(chunk, "ParentLocationName") ||
      undefined;
    out.push({
      id: stripXml(id),
      name: stripXml(name),
      place: place ? stripXml(place) : undefined,
      provider: "verbund-steiermark",
    });
  }
  return out.slice(0, 12);
}

function matchTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.trim() || null;
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
