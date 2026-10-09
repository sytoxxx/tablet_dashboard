import { describe, expect, it } from "vitest";
import {
  NEXT_DEPARTURES_MAX_AGE_MS,
  staleSafeNextDepartures,
  type NextDeparturesState,
} from "@/hooks/use-bus-live";

const fresh = (fetchedAt: string, status: NextDeparturesState["status"] = "live"): NextDeparturesState => ({
  status,
  rows: [{ time: "06:02", iso: "2026-10-06T04:02:00.000Z", line: "1", destination: "Apfelmoar" }],
  message: null,
  fetchedAt,
});

describe("staleSafeNextDepartures — an old list is never shown as 'next buses'", () => {
  const T0 = Date.parse("2026-10-06T04:00:00Z");

  it("keeps a fresh live list", () => {
    const list = fresh("2026-10-06T03:58:00Z");
    expect(staleSafeNextDepartures(list, T0)).toBe(list);
  });

  it("turns a list older than the limit into an honest 'nicht verfügbar'", () => {
    const old = fresh(new Date(T0 - NEXT_DEPARTURES_MAX_AGE_MS - 1000).toISOString());
    expect(staleSafeNextDepartures(old, T0)).toMatchObject({
      status: "unavailable",
      rows: [],
      message: "Busdaten momentan nicht verfügbar",
    });
  });

  it("never carries over test data", () => {
    expect(staleSafeNextDepartures(fresh("2026-10-06T03:59:00Z", "test"), T0)?.status).toBe("unavailable");
  });

  it("nothing cached -> nothing", () => {
    expect(staleSafeNextDepartures(undefined, T0)).toBeUndefined();
  });
});
