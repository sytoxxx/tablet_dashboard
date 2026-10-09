import { describe, expect, it, vi } from "vitest";
import { seedPersons } from "@/data/seed";
import { selectUpcomingBusRows } from "@/lib/morning/work-bus-glance";
import {
  buildNextDepartureRows,
  fetchNextDepartures,
  UNAVAILABLE_MESSAGE,
} from "@/server/bus/next-departures";
import type { ParsedTrip, ParsedTripLeg } from "@/server/bus/trias/parse-trips";

const heidi = seedPersons.find((p) => p.id === "heidi")!;

/** Tue 6 Oct 2026, 06:00 Vienna (CEST = UTC+2) */
const NOW = new Date("2026-10-06T04:00:00Z");

const leg = (over: Partial<ParsedTripLeg> = {}): ParsedTripLeg => ({
  type: "TRANSIT",
  from: "Kapfenberg Europaplatz",
  to: "Apfelmoar Einkaufszentrum",
  fromRef: "at:46:6005",
  toRef: "at:46:30537",
  line: "1",
  direction: "Apfelmoar",
  depPlannedIso: null,
  depEstimatedIso: null,
  arrPlannedIso: null,
  arrEstimatedIso: null,
  cancelled: false,
  durationIso: null,
  ...over,
});

/** A direct trip departing at `depIso` (UTC). */
const trip = (depIso: string, over: Partial<ParsedTripLeg> = {}, interchanges = 0): ParsedTrip => ({
  interchanges,
  durationIso: "PT10M",
  legs: [leg({ depPlannedIso: depIso, arrPlannedIso: depIso, ...over })],
});

describe("buildNextDepartureRows", () => {
  it("lists real departures chronologically with their Vienna clock time and absolute instant", () => {
    const rows = buildNextDepartureRows(
      [trip("2026-10-06T04:32:00Z"), trip("2026-10-06T04:02:00Z"), trip("2026-10-06T04:17:00Z")],
      NOW,
    );
    expect(rows.map((r) => r.time)).toEqual(["06:02", "06:17", "06:32"]);
    expect(rows[0]).toMatchObject({ iso: "2026-10-06T04:02:00.000Z", line: "1", destination: "Apfelmoar" });
  });

  it("drops departures that already left, keeps the one that leaves right now", () => {
    const rows = buildNextDepartureRows(
      [trip("2026-10-06T03:50:00Z"), trip("2026-10-06T03:59:45Z"), trip("2026-10-06T04:10:00Z")],
      NOW,
    );
    expect(rows.map((r) => r.time)).toEqual(["05:59", "06:10"]);
  });

  it("works across midnight: after 23:50 the next buses are tomorrow's, in the right order", () => {
    const late = new Date("2026-10-06T21:50:00Z"); // 23:50 Vienna
    const rows = buildNextDepartureRows(
      [trip("2026-10-06T22:30:00Z"), trip("2026-10-07T04:02:00Z"), trip("2026-10-06T21:55:00Z")],
      late,
    );
    expect(rows.map((r) => r.time)).toEqual(["23:55", "00:30", "06:02"]);
    // the client picks them by absolute time — not "06:02 < 23:50 = departed"
    const shown = selectUpcomingBusRows(rows, late);
    expect(shown.map((r) => r.time)).toEqual(["23:55", "00:30", "06:02"]);
  });

  it("keeps a cancelled departure, marked as cancelled — never as a normal bus", () => {
    const rows = buildNextDepartureRows(
      [trip("2026-10-06T04:02:00Z", { cancelled: true }), trip("2026-10-06T04:17:00Z")],
      NOW,
    );
    expect(rows[0]).toMatchObject({ time: "06:02", cancelled: true });
    expect(rows[1]).toMatchObject({ time: "06:17", cancelled: false });
  });

  it("reports the real delay and realtime flag, preferring the estimated time", () => {
    const rows = buildNextDepartureRows(
      [
        trip("2026-10-06T04:02:00Z", { depEstimatedIso: "2026-10-06T04:08:00Z" }),
      ],
      NOW,
    );
    expect(rows[0]).toMatchObject({ time: "06:08", delayMinutes: 6, realtime: true });
  });

  it("collapses the same bus returned by several trips", () => {
    const rows = buildNextDepartureRows(
      [trip("2026-10-06T04:02:00Z"), trip("2026-10-06T04:02:00Z"), trip("2026-10-06T04:17:00Z")],
      NOW,
    );
    expect(rows).toHaveLength(2);
  });

  it("prefers direct buses; trips with a transfer only appear when there is no direct one", () => {
    const withTransfer = trip("2026-10-06T04:05:00Z", { line: "7" }, 1);
    expect(
      buildNextDepartureRows([withTransfer, trip("2026-10-06T04:20:00Z")], NOW).map((r) => r.line),
    ).toEqual(["1"]);
    expect(buildNextDepartureRows([withTransfer], NOW).map((r) => r.line)).toEqual(["7"]);
  });

  it("returns an empty list when there is nothing — never invents a row", () => {
    expect(buildNextDepartureRows([], NOW)).toEqual([]);
    expect(buildNextDepartureRows([{ interchanges: 0, durationIso: null, legs: [] }], NOW)).toEqual([]);
  });
});

describe("fetchNextDepartures — honest status", () => {
  const okFetch = (trips: ParsedTrip[]) =>
    vi.fn().mockResolvedValue({ ok: true, trips, isTestData: false, fetchedAt: "2026-10-06T04:00:01.000Z" });
  const deps = (over: Record<string, unknown> = {}) => ({
    isConfigured: () => true,
    fetchTrips: okFetch([trip("2026-10-06T04:02:00Z")]),
    production: true,
    ...over,
  });

  it("live: real rows, no message", async () => {
    const r = await fetchNextDepartures(heidi, NOW, deps() as never);
    expect(r).toMatchObject({ status: "live", message: null });
    expect(r.rows.map((x) => x.time)).toEqual(["06:02"]);
  });

  it("asks TRIAS for connections counted from NOW, regardless of any work plan", async () => {
    const fetchTrips = okFetch([]);
    await fetchNextDepartures(heidi, NOW, deps({ fetchTrips }) as never);
    const query = fetchTrips.mock.calls[0]![0];
    expect(query.depArrTime).toBe("2026-10-06T04:00:00Z");
    expect(query.originRef).toBe("at:46:6005");
  });

  it("live but nothing upcoming: status stays live with zero rows (an honest empty state, not an error)", async () => {
    const r = await fetchNextDepartures(heidi, NOW, deps({ fetchTrips: okFetch([]) }) as never);
    expect(r).toMatchObject({ status: "live", rows: [] });
  });

  it("TRIAS error -> unavailable with the plain message, no rows", async () => {
    const fetchTrips = vi.fn().mockResolvedValue({ ok: false, trips: [], isTestData: true, warning: "HTTP 503", fetchedAt: "x" });
    const r = await fetchNextDepartures(heidi, NOW, deps({ fetchTrips }) as never);
    expect(r).toMatchObject({ status: "unavailable", rows: [], message: UNAVAILABLE_MESSAGE });
  });

  it("a thrown error is also just 'unavailable'", async () => {
    const fetchTrips = vi.fn().mockRejectedValue(new Error("boom"));
    const r = await fetchNextDepartures(heidi, NOW, deps({ fetchTrips }) as never);
    expect(r.status).toBe("unavailable");
  });

  it("PRODUCTION without TRIAS never shows the sample timetable", async () => {
    const r = await fetchNextDepartures(heidi, NOW, deps({ isConfigured: () => false, production: true }) as never);
    expect(r).toMatchObject({ status: "unavailable", rows: [], message: UNAVAILABLE_MESSAGE });
  });

  it("development without TRIAS shows the sample rows, labelled as test data", async () => {
    const r = await fetchNextDepartures(
      heidi,
      new Date("2026-10-06T04:00:00Z"),
      deps({ isConfigured: () => false, production: false }) as never,
    );
    expect(r.status).toBe("test");
    expect(r.message).toContain("Testdaten");
    expect(r.rows.every((x) => x.destination.includes("[TEST]"))).toBe(true);
  });
});
