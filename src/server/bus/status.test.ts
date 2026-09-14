import { afterEach, describe, expect, it } from "vitest";
import { getBusStatusSnapshot } from "@/server/bus/status";
import { createBusProvider } from "@/server/bus";
import { selectRelevantDeparture } from "@/lib/bus/select";

describe("phase 8 bus readiness", () => {
  const keys = [
    "BUS_PROVIDER",
    "VERBUND_STEIERMARK_TRIAS_URL",
    "VAO_API_KEY",
    "VAO_BASE_URL",
  ] as const;
  const snap: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of keys) {
      if (snap[k] === undefined) delete process.env[k];
      else process.env[k] = snap[k];
    }
  });

  function clear() {
    for (const k of keys) {
      snap[k] = process.env[k];
      delete process.env[k];
    }
  }

  it("status is Testdaten when ENV missing", () => {
    clear();
    const s = getBusStatusSnapshot();
    expect(s.status).toBe("testdata");
    expect(s.statusLabel).toBe("Testdaten");
    expect(s.steiermarkConfigured).toBe(false);
  });

  it("status is Live-capable when TRIAS URL present", () => {
    clear();
    process.env.BUS_PROVIDER = "auto";
    process.env.VERBUND_STEIERMARK_TRIAS_URL = "https://example.test/trias";
    const s = getBusStatusSnapshot();
    expect(s.status).toBe("live");
    expect(s.activeProvider).toBe("verbund-steiermark");
  });

  it("status Offline when online=false", () => {
    clear();
    const s = getBusStatusSnapshot({ online: false });
    expect(s.status).toBe("offline");
  });

  it("provider error yields testdata fallback message", () => {
    clear();
    process.env.VERBUND_STEIERMARK_TRIAS_URL = "https://example.test/trias";
    const s = getBusStatusSnapshot({ lastError: "timeout" });
    expect(s.status).toBe("testdata");
    expect(s.lastError).toBe("timeout");
  });

  it("missing ENV keeps local isTestData", async () => {
    clear();
    const provider = createBusProvider("auto", {
      stopName: "Start",
      localDepartures: [{ line: "1", destination: "Bruck [TEST]", time: "05:32" }],
    });
    const result = await provider.getDepartures({
      stopName: "Start",
      localDepartures: [{ line: "1", destination: "Bruck [TEST]", time: "05:32" }],
    });
    expect(result.isTestData).toBe(true);
    expect(result.source).toBe("local");
  });

  it("disabled bus selection: empty departures → null", () => {
    const next = selectRelevantDeparture([], new Date(2026, 8, 14, 5, 0), {
      stopName: "Start",
      targetStartHHMM: "06:00",
      leadTimeMinutes: 30,
    });
    expect(next).toBeNull();
  });
});
