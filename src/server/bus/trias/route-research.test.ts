import { describe, expect, it } from "vitest";
import { buildTriasStopEventRequest } from "@/server/bus/trias/requests";

/**
 * Research guards — documents what production TRIAS supports today.
 * Does not wire TripRequest into the app.
 */
describe("TRIAS route research guards", () => {
  it("StopEventRequest still requests IncludeRealtimeData", () => {
    const xml = buildTriasStopEventRequest({
      stopRef: "at:46:6005",
      requestor: "OpenService",
      depArrTime: "2026-09-15T12:00:00Z",
    });
    expect(xml).toContain("<IncludeRealtimeData>true</IncludeRealtimeData>");
    expect(xml).toContain("<StopPointRef>at:46:6005</StopPointRef>");
    expect(xml).not.toContain("TripRequest");
  });

  it("documents known regional StopPointRefs from live research (not invented)", () => {
    const known = {
      europaplatz: "at:46:6005",
      apfelmoarEinkaufszentrum: "at:46:30537",
      apfelmoarViktorAdler: "at:46:7893",
      apfelmoarRainweg: "at:46:4459",
      apfelmoarWaldbrunnerhof: "at:46:4490",
      altersheimgasse: "at:46:6056",
      kolomanWallischPlatzBruck: "at:46:2063",
    };
    for (const id of Object.values(known)) {
      expect(id).toMatch(/^at:\d+:\d+$/);
    }
  });
});
