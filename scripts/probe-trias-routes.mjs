#!/usr/bin/env node
/**
 * Research-only: probe Verbund Steiermark TRIAS for Heidi/Birgit route data.
 * Uses LocationInformation + StopEvent + experimental TripRequest.
 * Prints structured JSON only — never full XML or secrets.
 *
 * Usage: node scripts/probe-trias-routes.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim();
      if (!(key in process.env) || process.env[key] === "") process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const ENDPOINT =
  process.env.VERBUND_STEIERMARK_TRIAS_URL?.trim() ||
  "http://ogdtrias.verbundlinie.at:8183/stv/trias";
const REQUESTOR =
  process.env.VERBUND_STEIERMARK_REQUESTOR_REF?.trim() || "OpenService";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function ts() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
function nsTag(tag) {
  return `(?:\\w+:)?${tag}`;
}
function matchTag(xml, tag) {
  const t = nsTag(tag);
  const m = xml.match(new RegExp(`<${t}(?:\\s[^>]*)?>([^<]*)</${t}>`, "i"));
  return m?.[1]?.trim() || null;
}
function matchTagOrText(xml, tag) {
  const t = nsTag(tag);
  const block = xml.match(
    new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, "i"),
  );
  if (!block) return null;
  const inner = block[1];
  if (!inner.includes("<")) return inner.trim() || null;
  return matchTag(inner, "Text") || inner.replace(/<[^>]+>/g, " ").trim() || null;
}

async function post(body) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 12000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: c.signal,
      headers: { "Content-Type": "text/xml", Accept: "application/xml, text/xml, */*" },
      body,
    });
    const xml = await res.text();
    return {
      httpStatus: res.status,
      looksLikeTrias: /<\s*(?:\w+:)?Trias\b/i.test(xml.slice(0, 4000)),
      xml,
    };
  } finally {
    clearTimeout(t);
  }
}

function locReq(q) {
  const now = ts();
  return `<?xml version="1.0" encoding="UTF-8"?>
<Trias version="1.2" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri">
  <ServiceRequest>
    <siri:RequestTimestamp>${now}</siri:RequestTimestamp>
    <siri:RequestorRef>${esc(REQUESTOR)}</siri:RequestorRef>
    <RequestPayload>
      <LocationInformationRequest>
        <InitialInput><LocationName>${esc(q)}</LocationName></InitialInput>
        <Restrictions><Type>stop</Type><NumberOfResults>12</NumberOfResults></Restrictions>
      </LocationInformationRequest>
    </RequestPayload>
  </ServiceRequest>
</Trias>`;
}

function stopEventReq(stopRef) {
  const now = ts();
  return `<?xml version="1.0" encoding="UTF-8"?>
<Trias version="1.2" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri">
  <ServiceRequest>
    <siri:RequestTimestamp>${now}</siri:RequestTimestamp>
    <siri:RequestorRef>${esc(REQUESTOR)}</siri:RequestorRef>
    <RequestPayload>
      <StopEventRequest>
        <Location>
          <LocationRef><StopPointRef>${esc(stopRef)}</StopPointRef></LocationRef>
          <DepArrTime>${now}</DepArrTime>
        </Location>
        <Params>
          <NumberOfResults>20</NumberOfResults>
          <StopEventType>departure</StopEventType>
          <IncludeRealtimeData>true</IncludeRealtimeData>
        </Params>
      </StopEventRequest>
    </RequestPayload>
  </ServiceRequest>
</Trias>`;
}

function tripReq(originRef, destRef) {
  const now = ts();
  return `<?xml version="1.0" encoding="UTF-8"?>
<Trias version="1.2" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri">
  <ServiceRequest>
    <siri:RequestTimestamp>${now}</siri:RequestTimestamp>
    <siri:RequestorRef>${esc(REQUESTOR)}</siri:RequestorRef>
    <RequestPayload>
      <TripRequest>
        <Origin>
          <LocationRef><StopPointRef>${esc(originRef)}</StopPointRef></LocationRef>
          <DepArrTime>${now}</DepArrTime>
        </Origin>
        <Destination>
          <LocationRef><StopPointRef>${esc(destRef)}</StopPointRef></LocationRef>
        </Destination>
        <Params><NumberOfResults>6</NumberOfResults></Params>
      </TripRequest>
    </RequestPayload>
  </ServiceRequest>
</Trias>`;
}

function parseStops(xml) {
  return xml
    .split(new RegExp(`<${nsTag("LocationResult")}[\\s>]`, "i"))
    .slice(1)
    .map((chunk) => {
      const id =
        matchTag(chunk, "StopPointRef") || matchTag(chunk, "StopPlaceRef");
      const name =
        matchTagOrText(chunk, "StopPointName") ||
        matchTagOrText(chunk, "LocationName");
      if (!id || !name) return null;
      const locality =
        matchTagOrText(chunk, "LocalityName") ||
        (matchTagOrText(chunk, "StopPointName")
          ? matchTagOrText(chunk, "LocationName")
          : null);
      return { name, id, locality: locality || undefined };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function parseDepartures(xml) {
  return xml
    .split(new RegExp(`<${nsTag("StopEventResult")}[\\s>]`, "i"))
    .slice(1)
    .map((chunk) => {
      const service =
        chunk.match(
          new RegExp(
            `<${nsTag("Service")}[\\s>]([\\s\\S]*?)</${nsTag("Service")}>`,
            "i",
          ),
        )?.[1] ?? chunk;
      const callAt =
        chunk.match(
          new RegExp(
            `<${nsTag("CallAtStop")}[\\s>]([\\s\\S]*?)</${nsTag("CallAtStop")}>`,
            "i",
          ),
        )?.[1] ?? chunk;
      const depBlock =
        callAt.match(
          new RegExp(
            `<${nsTag("ServiceDeparture")}[\\s>]([\\s\\S]*?)</${nsTag("ServiceDeparture")}>`,
            "i",
          ),
        )?.[1] ?? callAt;
      const planned = matchTag(depBlock, "TimetabledTime");
      const estimated = matchTag(depBlock, "EstimatedTime");
      return {
        line:
          matchTagOrText(service, "PublishedLineName") ||
          matchTag(service, "LineRef"),
        destination: matchTagOrText(service, "DestinationText"),
        planned,
        estimated,
        hasRealtime: Boolean(estimated),
        cancelled:
          /^(true|1)$/i.test(matchTag(service, "Cancelled") || "") ||
          /^(true|1)$/i.test(matchTag(callAt, "NotServicedStop") || ""),
      };
    });
}

function summarizeTrips(xml) {
  return xml
    .split(new RegExp(`<${nsTag("TripResult")}[\\s>]`, "i"))
    .slice(1)
    .slice(0, 6)
    .map((chunk) => {
      const legs = [];
      for (const leg of chunk
        .split(new RegExp(`<${nsTag("TripLeg")}[\\s>]`, "i"))
        .slice(1)) {
        const timed = leg.match(
          new RegExp(
            `<${nsTag("TimedLeg")}[\\s>]([\\s\\S]*?)</${nsTag("TimedLeg")}>`,
            "i",
          ),
        )?.[1];
        const cont = leg.match(
          new RegExp(
            `<${nsTag("ContinuousLeg")}[\\s>]([\\s\\S]*?)</${nsTag("ContinuousLeg")}>`,
            "i",
          ),
        )?.[1];
        if (timed) {
          const board =
            timed.match(
              new RegExp(
                `<${nsTag("LegBoard")}[\\s>]([\\s\\S]*?)</${nsTag("LegBoard")}>`,
                "i",
              ),
            )?.[1] || "";
          const alight =
            timed.match(
              new RegExp(
                `<${nsTag("LegAlight")}[\\s>]([\\s\\S]*?)</${nsTag("LegAlight")}>`,
                "i",
              ),
            )?.[1] || "";
          const svc =
            timed.match(
              new RegExp(
                `<${nsTag("Service")}[\\s>]([\\s\\S]*?)</${nsTag("Service")}>`,
                "i",
              ),
            )?.[1] || "";
          legs.push({
            type: "timed",
            line: matchTagOrText(svc, "PublishedLineName"),
            direction: matchTagOrText(svc, "DestinationText"),
            from: matchTagOrText(board, "StopPointName"),
            fromRef: matchTag(board, "StopPointRef"),
            to: matchTagOrText(alight, "StopPointName"),
            toRef: matchTag(alight, "StopPointRef"),
            depPlanned: matchTag(board, "TimetabledTime"),
            depEstimated: matchTag(board, "EstimatedTime"),
            arrPlanned: matchTag(alight, "TimetabledTime"),
            arrEstimated: matchTag(alight, "EstimatedTime"),
            cancelled: /^(true|1)$/i.test(matchTag(svc, "Cancelled") || ""),
          });
        } else if (cont) {
          const start =
            cont.match(
              new RegExp(
                `<${nsTag("LegStart")}[\\s>]([\\s\\S]*?)</${nsTag("LegStart")}>`,
                "i",
              ),
            )?.[1] || "";
          const end =
            cont.match(
              new RegExp(
                `<${nsTag("LegEnd")}[\\s>]([\\s\\S]*?)</${nsTag("LegEnd")}>`,
                "i",
              ),
            )?.[1] || "";
          legs.push({
            type: "walk",
            duration: matchTag(cont, "Duration"),
            from:
              matchTagOrText(start, "LocationName") ||
              matchTagOrText(start, "StopPointName"),
            to:
              matchTagOrText(end, "LocationName") ||
              matchTagOrText(end, "StopPointName"),
          });
        }
      }
      return {
        interchanges: matchTag(chunk, "Interchanges"),
        duration: matchTag(chunk, "Duration"),
        legs,
      };
    });
}

const EURO_CANDIDATE = "Kapfenberg Europaplatz";
const APFEL = [
  { name: "Rainweg", id: "at:46:4459" },
  { name: "Waldbrunnerhof", id: "at:46:4490" },
  { name: "Viktor-Adler-Straße", id: "at:46:7893" },
  { name: "Einkaufszentrum", id: "at:46:30537" },
];

const report = {
  endpointHost: new URL(ENDPOINT).host,
  analyzedAt: ts(),
  capability: {
    locationSearch: true,
    stopEvents: true,
    tripRequestInApp: false,
    tripRequestProbed: true,
  },
  heidi: {},
  birgit: {},
};

const euroSearch = await post(locReq(EURO_CANDIDATE));
const euroStops = euroSearch.looksLikeTrias ? parseStops(euroSearch.xml) : [];
const euro = euroStops[0] || null;
report.heidi.start = euro;

if (euro?.id) {
  const deps = await post(stopEventReq(euro.id));
  const parsed = deps.looksLikeTrias ? parseDepartures(deps.xml) : [];
  report.heidi.stopEventsTowardApfelmoar = parsed.filter((d) =>
    /apfel/i.test(d.destination || ""),
  );
  report.heidi.stopEventsTowardBruck = parsed.filter((d) =>
    /bruck|wallisch/i.test(d.destination || ""),
  );
  report.heidi.realtimeShare = {
    total: parsed.length,
    withEstimated: parsed.filter((d) => d.hasRealtime).length,
  };

  report.heidi.tripsByApfelStop = {};
  for (const dest of APFEL) {
    const r = await post(tripReq(euro.id, dest.id));
    report.heidi.tripsByApfelStop[dest.name] = {
      destRef: dest.id,
      httpStatus: r.httpStatus,
      trips: r.looksLikeTrias ? summarizeTrips(r.xml) : [],
    };
  }

  const alters = await post(locReq("Altersheimgasse"));
  const koloman = await post(locReq("Koloman-Wallisch-Platz"));
  const pflege = await post(locReq("Pflegeverband Bruck/Mur"));
  report.birgit.searches = {
    Altersheimgasse: alters.looksLikeTrias ? parseStops(alters.xml) : [],
    "Koloman-Wallisch-Platz": koloman.looksLikeTrias
      ? parseStops(koloman.xml)
      : [],
    "Pflegeverband Bruck/Mur": pflege.looksLikeTrias
      ? parseStops(pflege.xml)
      : [],
  };

  const altersStop = report.birgit.searches.Altersheimgasse.find((s) =>
    /altersheim/i.test(s.name),
  );
  const kolomanBruck = report.birgit.searches["Koloman-Wallisch-Platz"].find(
    (s) => /bruck/i.test(s.locality || ""),
  );

  report.birgit.trips = {};
  if (altersStop) {
    const r = await post(tripReq(euro.id, altersStop.id));
    report.birgit.trips.toAltersheimgasse = {
      destRef: altersStop.id,
      trips: r.looksLikeTrias ? summarizeTrips(r.xml) : [],
    };
  }
  if (kolomanBruck) {
    const r = await post(tripReq(euro.id, kolomanBruck.id));
    report.birgit.trips.toKolomanWallischPlatzBruck = {
      destRef: kolomanBruck.id,
      trips: r.looksLikeTrias ? summarizeTrips(r.xml) : [],
    };
  }
}

report.notes = [
  "No Pflegeverband Bruck/Mur stop/POI found in TRIAS location search.",
  "Altersheimgasse is a bus stop only — not the Pflegeverband end destination.",
  "TripRequest works on the OGD endpoint but is not wired into the app yet.",
];

console.log(JSON.stringify(report, null, 2));
