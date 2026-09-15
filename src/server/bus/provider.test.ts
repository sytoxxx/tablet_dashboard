import { afterEach, describe, expect, it } from "vitest";
import { resolveBusProviderMode, createBusProvider } from "@/server/bus";
import { searchTransitStops, getStopSearchCapability } from "@/server/bus/stop-search";

describe("bus provider selection", () => {
  const envKeys = [
    "BUS_PROVIDER",
    "VERBUND_STEIERMARK_TRIAS_URL",
    "VAO_API_KEY",
    "VAO_BASE_URL",
  ] as const;
  const snapshot: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of envKeys) {
      if (snapshot[key] === undefined) delete process.env[key];
      else process.env[key] = snapshot[key];
    }
  });

  function clearProviders() {
    for (const key of envKeys) {
      snapshot[key] = process.env[key];
      delete process.env[key];
    }
  }

  it("defaults to auto when unset", () => {
    clearProviders();
    expect(resolveBusProviderMode()).toBe("auto");
  });

  it("falls back to local provider when no live credentials (missing config)", async () => {
    clearProviders();
    process.env.BUS_PROVIDER = "auto";
    const provider = createBusProvider("auto", {
      stopName: "Start",
      localDepartures: [
        { line: "1", destination: "Bruck/Mur Bahnhof [TEST]", time: "05:32" },
      ],
    });
    expect(provider.name).toBe("local");
    const result = await provider.getDepartures({
      stopName: "Start",
      localDepartures: [
        { line: "1", destination: "Bruck/Mur Bahnhof [TEST]", time: "05:32" },
      ],
    });
    expect(result.source).toBe("local");
    expect(result.isTestData).toBe(true);
    expect(result.departures).toHaveLength(1);
  });

  it("prefers Steiermark when URL is configured in auto mode", () => {
    clearProviders();
    process.env.BUS_PROVIDER = "auto";
    process.env.VERBUND_STEIERMARK_TRIAS_URL = "https://example.test/trias";
    const provider = createBusProvider("auto", {
      stopName: "Start",
      localDepartures: [],
    });
    expect(provider.name).toBe("verbund-steiermark");
  });

  it("does not invent stop search results without credentials", async () => {
    clearProviders();
    const cap = getStopSearchCapability();
    expect(cap.searchable).toBe(false);
    const result = await searchTransitStops("Kapfenberg");
    expect(result.searchable).toBe(false);
    expect(result.stops).toEqual([]);
    expect(result.isTestData).toBe(true);
    expect(result.message.toLowerCase()).toContain("manuell");
  });

  it("verbund-steiermark without URL returns local testdata", async () => {
    clearProviders();
    const provider = createBusProvider("verbund-steiermark");
    const result = await provider.getDepartures({
      stopName: "Start",
      externalId: "SOME_REF",
      localDepartures: [
        { line: "1", destination: "Bruck [TEST]", time: "05:32" },
      ],
    });
    expect(result.source).toBe("local");
    expect(result.isTestData).toBe(true);
    expect(result.warning?.toLowerCase()).toContain("nicht konfiguriert");
  });
});
