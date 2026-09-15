#!/usr/bin/env node
/**
 * Admin CLI: probe Verbund Steiermark TRIAS stop search (LocationInformationRequest).
 * Prints structured JSON only — never full XML or secrets.
 *
 * Usage: node scripts/probe-trias-stops.mjs
 * Requires VERBUND_STEIERMARK_TRIAS_URL (defaults to official OGD endpoint).
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
      if (!(key in process.env) || process.env[key] === "") {
        process.env[key] = val;
      }
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const ENDPOINT =
  process.env.VERBUND_STEIERMARK_TRIAS_URL?.trim() ||
  "http://ogdtrias.verbundlinie.at:8183/stv/trias";
const REQUESTOR =
  process.env.VERBUND_STEIERMARK_REQUESTOR_REF?.trim() || "OpenService";
const QUERIES = [
  "Apfelmoar",
  "Kapfenberg",
  "Bruck",
  "Apfelmoar Einkaufszentrum",
];

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildRequest(query) {
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Trias version="1.2" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri">
  <ServiceRequest>
    <siri:RequestTimestamp>${ts}</siri:RequestTimestamp>
    <siri:RequestorRef>${escapeXml(REQUESTOR)}</siri:RequestorRef>
    <RequestPayload>
      <LocationInformationRequest>
        <InitialInput>
          <LocationName>${escapeXml(query)}</LocationName>
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

function matchTag(xml, tag) {
  const t = `(?:\\w+:)?${tag}`;
  const m = xml.match(new RegExp(`<${t}(?:\\s[^>]*)?>([^<]*)</${t}>`, "i"));
  return m?.[1]?.trim() || null;
}

function matchTagOrText(xml, tag) {
  const t = `(?:\\w+:)?${tag}`;
  const block = xml.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, "i"));
  if (!block) return null;
  const inner = block[1];
  if (!inner.includes("<")) return inner.trim() || null;
  return matchTag(inner, "Text") || inner.replace(/<[^>]+>/g, " ").trim() || null;
}

function parseStops(xml) {
  const chunks = xml.split(/<(?:\w+:)?LocationResult[\s>]/i).slice(1);
  const out = [];
  for (const chunk of chunks) {
    const id = matchTag(chunk, "StopPointRef") || matchTag(chunk, "StopPlaceRef");
    const name =
      matchTagOrText(chunk, "StopPointName") ||
      matchTagOrText(chunk, "StopName") ||
      matchTagOrText(chunk, "LocationName");
    if (!id || !name) continue;
    const locality =
      matchTagOrText(chunk, "LocalityName") ||
      (matchTagOrText(chunk, "StopPointName")
        ? matchTagOrText(chunk, "LocationName")
        : null);
    out.push({
      name,
      stopPointRef: id,
      locality: locality || undefined,
      provider: "verbund-steiermark",
      isTestData: false,
    });
  }
  return out.slice(0, 12);
}

async function search(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "text/xml",
        Accept: "application/xml, text/xml, */*",
      },
      body: buildRequest(query),
    });
    const httpStatus = res.status;
    const xml = await res.text();
    const looksLikeTrias = /<\s*(?:\w+:)?Trias\b/i.test(xml.slice(0, 4000));
    const stops = looksLikeTrias ? parseStops(xml) : [];
    return {
      query,
      httpStatus,
      provider: "verbund-steiermark",
      isTestData: false,
      stopCount: stops.length,
      stops,
    };
  } finally {
    clearTimeout(timeout);
  }
}

const host = (() => {
  try {
    return new URL(ENDPOINT).host;
  } catch {
    return "invalid";
  }
})();

const results = [];
for (const q of QUERIES) {
  results.push(await search(q));
}

console.log(
  JSON.stringify(
    {
      endpointHost: host,
      busProvider: process.env.BUS_PROVIDER || "auto",
      results,
    },
    null,
    2,
  ),
);
