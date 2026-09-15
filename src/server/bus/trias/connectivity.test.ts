import { afterEach, describe, expect, it, vi } from "vitest";
import {
  looksLikeTriasXml,
  probeTriasConnectivity,
  toSafeConnectivitySummary,
} from "@/server/bus/trias/connectivity";
import {
  OFFICIAL_STEIERMARK_TRIAS_URL,
  TRIAS_CONTENT_TYPE,
  TRIAS_REQUEST_HEADERS,
} from "@/server/bus/trias/http";
import {
  buildTriasLocationInformationRequest,
  buildTriasStopEventRequest,
} from "@/server/bus/trias/requests";
import { VerbundSteiermarkBusProvider } from "@/server/bus/verbund-steiermark";

describe("TRIAS HTTP contract", () => {
  it("documents the official Steiermark endpoint", () => {
    expect(OFFICIAL_STEIERMARK_TRIAS_URL).toBe(
      "http://ogdtrias.verbundlinie.at:8183/stv/trias",
    );
  });

  it("uses Content-Type text/xml", () => {
    expect(TRIAS_CONTENT_TYPE).toBe("text/xml");
    expect(TRIAS_REQUEST_HEADERS["Content-Type"]).toBe("text/xml");
  });

  it("StopEventRequest includes IncludeRealtimeData=true and VDV Params", () => {
    const xml = buildTriasStopEventRequest({
      stopRef: "ST:1",
      requestor: "OpenService",
      depArrTime: "2026-09-15T05:00:00Z",
    });
    expect(xml).toContain("<IncludeRealtimeData>true</IncludeRealtimeData>");
    expect(xml).toContain("<Params>");
    expect(xml).not.toContain("StopEventParam");
    expect(xml).toContain('xmlns="http://www.vdv.de/trias"');
    expect(xml).toContain("<StopEventRequest>");
  });
});

describe("probeTriasConnectivity (mocked)", () => {
  const envKeys = [
    "VERBUND_STEIERMARK_TRIAS_URL",
    "VERBUND_STEIERMARK_REQUESTOR_REF",
  ] as const;
  const snap: Record<string, string | undefined> = {};

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of envKeys) {
      if (snap[k] === undefined) delete process.env[k];
      else process.env[k] = snap[k];
    }
  });

  function clearEnv() {
    for (const k of envKeys) {
      snap[k] = process.env[k];
      delete process.env[k];
    }
  }

  it("skips when URL not configured", async () => {
    clearEnv();
    const result = await probeTriasConnectivity({ endpoint: "" });
    expect(result.endpointConfigured).toBe(false);
    expect(result.errorKind).toBe("not_configured");
    expect(result.reachable).toBe(false);
  });

  it("POSTs with Content-Type text/xml and no Authorization header", async () => {
    clearEnv();
    process.env.VERBUND_STEIERMARK_TRIAS_URL = OFFICIAL_STEIERMARK_TRIAS_URL;
    process.env.VERBUND_STEIERMARK_REQUESTOR_REF = "secret-requestor-xyz";

    let captured: RequestInit | undefined;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      captured = init;
      return new Response(
        `<?xml version="1.0"?><Trias xmlns="http://www.vdv.de/trias"><ServiceDelivery/></Trias>`,
        { status: 200, headers: { "Content-Type": "text/xml" } },
      );
    }) as unknown as typeof fetch;

    const result = await probeTriasConnectivity({ fetchImpl });
    expect(result.reachable).toBe(true);
    expect(result.looksLikeTrias).toBe(true);
    expect(result.credentialsRequired).toBe(false);
    expect(result.httpStatus).toBe(200);
    expect(captured?.method).toBe("POST");
    const headers = new Headers(captured?.headers);
    expect(headers.get("Content-Type")).toBe("text/xml");
    expect(headers.get("Authorization")).toBeNull();
    expect(String(captured?.body)).toContain("LocationInformationRequest");
    expect(String(captured?.body)).not.toContain("Authorization");
  });

  it("reports Credentials fehlen/erforderlich on 401/403", async () => {
    clearEnv();
    const fetchImpl = vi.fn(async () =>
      new Response("forbidden", { status: 403 }),
    ) as unknown as typeof fetch;

    const result = await probeTriasConnectivity({
      endpoint: OFFICIAL_STEIERMARK_TRIAS_URL,
      fetchImpl,
    });
    expect(result.reachable).toBe(true);
    expect(result.credentialsRequired).toBe(true);
    expect(result.httpStatus).toBe(403);
    expect(result.message).toBe("Credentials fehlen/erforderlich");
  });

  it("handles timeout without leaking XML", async () => {
    clearEnv();
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    }) as unknown as typeof fetch;

    const result = await probeTriasConnectivity({
      endpoint: OFFICIAL_STEIERMARK_TRIAS_URL,
      timeoutMs: 30,
      fetchImpl,
    });
    expect(result.timedOut).toBe(true);
    expect(result.reachable).toBe(false);
    expect(result.errorKind).toBe("timeout");
    const summary = toSafeConnectivitySummary(result);
    expect(summary).not.toMatch(/<\s*Trias/i);
    expect(summary).not.toContain("<?xml");
  });

  it("safe summary never contains secrets or full XML", () => {
    clearEnv();
    const secret = "super-secret-requestor-ref-999";
    process.env.VERBUND_STEIERMARK_REQUESTOR_REF = secret;
    const xmlBody = `<?xml version="1.0"?><Trias>${"x".repeat(500)}</Trias>`;
    const result = {
      endpointConfigured: true,
      endpointHost: "ogdtrias.verbundlinie.at:8183",
      httpStatus: 200,
      reachable: true,
      credentialsRequired: false,
      looksLikeTrias: true,
      timedOut: false,
      errorKind: "none" as const,
      message:
        "TRIAS-Endpoint ohne Credentials erreichbar — Antwort als TRIAS erkannt.",
    };
    const summary = toSafeConnectivitySummary(result);
    expect(summary).not.toContain(secret);
    expect(summary).not.toContain(xmlBody);
    expect(summary).not.toContain("<?xml");
    expect(summary).not.toMatch(/<\s*Trias/i);
    expect(summary).toContain("looksLikeTrias=true");
    expect(summary).toContain("http=200");
  });

  it("looksLikeTriasXml detects VDV envelope", () => {
    expect(
      looksLikeTriasXml(
        `<?xml version="1.0"?><Trias xmlns="http://www.vdv.de/trias"></Trias>`,
      ),
    ).toBe(true);
    expect(looksLikeTriasXml("<html>nope</html>")).toBe(false);
  });
});

describe("VerbundSteiermarkBusProvider request contract (mocked)", () => {
  const envKeys = [
    "VERBUND_STEIERMARK_TRIAS_URL",
    "VERBUND_STEIERMARK_REQUESTOR_REF",
  ] as const;
  const snap: Record<string, string | undefined> = {};

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of envKeys) {
      if (snap[k] === undefined) delete process.env[k];
      else process.env[k] = snap[k];
    }
  });

  it("POSTs StopEventRequest with text/xml and IncludeRealtimeData", async () => {
    for (const k of envKeys) {
      snap[k] = process.env[k];
    }
    process.env.VERBUND_STEIERMARK_TRIAS_URL = OFFICIAL_STEIERMARK_TRIAS_URL;
    process.env.VERBUND_STEIERMARK_REQUESTOR_REF = "OpenService";

    let captured: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        captured = init;
        return new Response(
          `<?xml version="1.0"?><Trias xmlns="http://www.vdv.de/trias">
            <StopEventResult>
              <StopEvent>
                <ThisCall><CallAtStop>
                  <StopPointRef>ST:1</StopPointRef>
                  <StopPointName><Text>Test</Text></StopPointName>
                  <ServiceDeparture>
                    <TimetabledTime>2026-09-15T06:00:00Z</TimetabledTime>
                  </ServiceDeparture>
                </CallAtStop></ThisCall>
                <Service>
                  <PublishedLineName><Text>1</Text></PublishedLineName>
                  <DestinationText><Text>Bruck</Text></DestinationText>
                </Service>
              </StopEvent>
            </StopEventResult>
          </Trias>`,
          { status: 200 },
        );
      }),
    );

    const provider = new VerbundSteiermarkBusProvider();
    await provider.getDepartures({
      stopName: "Test",
      externalId: "ST:1",
      localDepartures: [],
    });

    expect(captured?.method).toBe("POST");
    const headers = new Headers(captured?.headers);
    expect(headers.get("Content-Type")).toBe("text/xml");
    expect(headers.get("Authorization")).toBeNull();
    expect(String(captured?.body)).toContain(
      "<IncludeRealtimeData>true</IncludeRealtimeData>",
    );
  });
});

describe("TRIAS live connectivity probe", () => {
  it(
    "probes the official Verbund Steiermark endpoint",
    async () => {
      const result = await probeTriasConnectivity({
        endpoint: OFFICIAL_STEIERMARK_TRIAS_URL,
        timeoutMs: 12_000,
      });

      // Structured outcome only — never assert on full XML body.
      expect(result.endpointConfigured).toBe(true);
      expect(result.endpointHost).toBe("ogdtrias.verbundlinie.at:8183");
      expect(typeof result.message).toBe("string");
      expect(result.message).not.toMatch(/<\s*Trias/i);
      expect(result.message).not.toContain("<?xml");

      const summary = toSafeConnectivitySummary(result);
      expect(summary).not.toMatch(/<\s*Trias/i);

      // Soft expectations: either credentials gate or a real HTTP answer.
      if (result.credentialsRequired) {
        expect(result.message).toBe("Credentials fehlen/erforderlich");
        expect([401, 403]).toContain(result.httpStatus);
      } else if (result.timedOut || result.errorKind === "network") {
        expect(result.reachable).toBe(false);
      } else {
        expect(result.httpStatus).not.toBeNull();
        expect(result.reachable).toBe(true);
      }

      // Expose outcome for the agent report via console without XML.
      console.info("[trias-live-probe]", summary, result.message);
    },
    20_000,
  );
});

describe("LocationInformationRequest builder", () => {
  it("builds VDV LocationInformationRequest without client credentials", () => {
    const xml = buildTriasLocationInformationRequest({
      query: "Kapfenberg",
      requestor: "OpenService",
      timestamp: "2026-09-15T05:00:00Z",
    });
    expect(xml).toContain("<LocationInformationRequest>");
    expect(xml).toContain("<LocationName>Kapfenberg</LocationName>");
    expect(xml).not.toContain("Authorization");
    expect(xml).not.toContain("apiKey");
    expect(xml).not.toContain("password");
  });
});
