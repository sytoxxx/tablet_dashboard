import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getStopSearchCapability,
  searchTransitStops,
} from "@/server/bus/stop-search";
import { parseTriasLocationResults } from "@/server/bus/trias/parse-locations";
import { OFFICIAL_STEIERMARK_TRIAS_URL } from "@/server/bus/trias/http";

const ENV_KEYS = [
  "BUS_PROVIDER",
  "VERBUND_STEIERMARK_TRIAS_URL",
  "VERBUND_STEIERMARK_REQUESTOR_REF",
  "VAO_API_KEY",
  "VAO_BASE_URL",
] as const;

describe("TRIAS stop search (unit)", () => {
  const snap: Record<string, string | undefined> = {};

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of ENV_KEYS) {
      if (snap[k] === undefined) delete process.env[k];
      else process.env[k] = snap[k];
    }
  });

  function clearEnv() {
    for (const k of ENV_KEYS) {
      snap[k] = process.env[k];
      delete process.env[k];
    }
  }

  it("with BUS_PROVIDER=auto and TRIAS URL uses verbund-steiermark first", async () => {
    clearEnv();
    process.env.BUS_PROVIDER = "auto";
    process.env.VERBUND_STEIERMARK_TRIAS_URL = OFFICIAL_STEIERMARK_TRIAS_URL;
    process.env.VAO_API_KEY = "should-not-be-used";

    const cap = getStopSearchCapability();
    expect(cap.searchable).toBe(true);
    expect(cap.provider).toBe("verbund-steiermark");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          `<?xml version="1.0"?>
          <trias:Trias xmlns:trias="http://www.vdv.de/trias">
            <trias:LocationResult>
              <trias:Location>
                <trias:StopPoint>
                  <trias:StopPointRef>at:46:30537</trias:StopPointRef>
                  <trias:StopPointName><trias:Text>Einkaufszentrum</trias:Text></trias:StopPointName>
                </trias:StopPoint>
                <trias:LocationName><trias:Text>Apfelmoar</trias:Text></trias:LocationName>
              </trias:Location>
            </trias:LocationResult>
          </trias:Trias>`,
          { status: 200 },
        ),
      ),
    );

    const result = await searchTransitStops("Apfelmoar Einkaufszentrum");
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("verbund-steiermark");
    expect(result.isTestData).toBe(false);
    expect(result.stops).toHaveLength(1);
    expect(result.stops[0].id).toBe("at:46:30537");
    expect(result.stops[0].name).toBe("Einkaufszentrum");
    expect(result.stops[0].locality).toBe("Apfelmoar");
    expect(result.stops[0].provider).toBe("verbund-steiermark");
  });

  it("keeps original StopPointRef from namespaced TRIAS XML (never invents)", () => {
    const xml = `<?xml version="1.0"?>
      <trias:Trias xmlns:trias="http://www.vdv.de/trias">
        <trias:LocationResult>
          <trias:Location>
            <trias:StopPoint>
              <trias:StopPointRef>at:46:4459</trias:StopPointRef>
              <trias:StopPointName><trias:Text>Rainweg</trias:Text></trias:StopPointName>
            </trias:StopPoint>
            <trias:LocationName><trias:Text>Apfelmoar</trias:Text></trias:LocationName>
            <trias:GeoPosition>
              <trias:Longitude>15.34102</trias:Longitude>
              <trias:Latitude>47.47049</trias:Latitude>
            </trias:GeoPosition>
          </trias:Location>
        </trias:LocationResult>
      </trias:Trias>`;
    const hits = parseTriasLocationResults(xml);
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe("at:46:4459");
    expect(hits[0].name).toBe("Rainweg");
    expect(hits[0].locality).toBe("Apfelmoar");
    expect(hits[0].provider).toBe("verbund-steiermark");
  });

  it("skips hits without StopPointRef", () => {
    const xml = `<?xml version="1.0"?><trias:Trias xmlns:trias="http://www.vdv.de/trias">
      <trias:LocationResult>
        <trias:Location>
          <trias:LocationName><trias:Text>Nur Name</trias:Text></trias:LocationName>
        </trias:Location>
      </trias:LocationResult>
    </trias:Trias>`;
    expect(parseTriasLocationResults(xml)).toEqual([]);
  });

  it("timeout/error stays safe (empty stops, no throw)", async () => {
    clearEnv();
    process.env.BUS_PROVIDER = "auto";
    process.env.VERBUND_STEIERMARK_TRIAS_URL = OFFICIAL_STEIERMARK_TRIAS_URL;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("Aborted");
        err.name = "AbortError";
        throw err;
      }),
    );

    const result = await searchTransitStops("Kapfenberg");
    expect(result.ok).toBe(false);
    expect(result.stops).toEqual([]);
    expect(result.provider).toBe("verbund-steiermark");
    expect(result.message.toLowerCase()).toContain("nicht erreichbar");
    expect(JSON.stringify(result)).not.toMatch(/<\s*(?:\w+:)?Trias/i);
  });

  it("without TRIAS/VAO remains manual testdata search", async () => {
    clearEnv();
    process.env.BUS_PROVIDER = "auto";
    const result = await searchTransitStops("Kapfenberg");
    expect(result.searchable).toBe(false);
    expect(result.isTestData).toBe(true);
    expect(result.stops).toEqual([]);
  });
});

describe("TRIAS live stop search (structured only)", () => {
  const queries = [
    "Apfelmoar",
    "Kapfenberg",
    "Bruck",
    "Apfelmoar Einkaufszentrum",
  ] as const;

  it(
    "returns real StopPointRefs for regional queries via searchTransitStops",
    async () => {
      const prevProvider = process.env.BUS_PROVIDER;
      const prevUrl = process.env.VERBUND_STEIERMARK_TRIAS_URL;
      process.env.BUS_PROVIDER = "auto";
      process.env.VERBUND_STEIERMARK_TRIAS_URL = OFFICIAL_STEIERMARK_TRIAS_URL;

      try {
        const report: Array<{
          query: string;
          provider: string | null;
          isTestData: boolean;
          stops: Array<{
            name: string;
            id: string;
            locality?: string;
            provider: string;
          }>;
        }> = [];

        for (const query of queries) {
          const result = await searchTransitStops(query);
          expect(result.provider).toBe("verbund-steiermark");
          expect(result.isTestData).toBe(false);
          expect(result.ok).toBe(true);

          const stops = result.stops.map((s) => ({
            name: s.name,
            id: s.id,
            locality: s.locality,
            provider: String(s.provider),
          }));

          for (const s of stops) {
            expect(s.id.length).toBeGreaterThan(0);
            expect(s.id).toMatch(/^at:/);
            expect(s.provider).toBe("verbund-steiermark");
          }

          report.push({
            query,
            provider: result.provider,
            isTestData: result.isTestData,
            stops,
          });
        }

        // Structured report only — never full XML.
        console.info(
          "[trias-stop-search-live]",
          JSON.stringify(report, null, 2),
        );

        const apfel = report.find((r) => r.query === "Apfelmoar");
        expect(apfel?.stops.some((s) => s.id === "at:46:30537")).toBe(true);
        const ez = report.find((r) => r.query === "Apfelmoar Einkaufszentrum");
        expect(ez?.stops[0]?.id).toBe("at:46:30537");
      } finally {
        if (prevProvider === undefined) delete process.env.BUS_PROVIDER;
        else process.env.BUS_PROVIDER = prevProvider;
        if (prevUrl === undefined) delete process.env.VERBUND_STEIERMARK_TRIAS_URL;
        else process.env.VERBUND_STEIERMARK_TRIAS_URL = prevUrl;
      }
    },
    60_000,
  );
});
