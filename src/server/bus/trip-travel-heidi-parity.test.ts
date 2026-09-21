import { describe, expect, it, vi } from "vitest";
import type { PersonProfile } from "@/lib/types";

/**
 * Regression test for the real bug found while bringing Heidi to parity with
 * Birgit: `planHeidiTripTravel` used to derive `workStart` only from the
 * static `transitPrefs.desiredArrivalHHmm` admin preference and hardcoded
 * `workEnd: null`, completely ignoring the real, dated work-plan shift
 * (`getWorkShiftForDate`) that the caller had already resolved. Birgit's
 * function always took `workStart`/`workEnd` as explicit parameters; Heidi's
 * now does too — this proves the fix, not just that it type-checks.
 */

const NOW = new Date("2026-09-21T05:00:00Z"); // 07:00 Vienna (CEST)

function futureIso(minutesFromNow: number): string {
  return new Date(NOW.getTime() + minutesFromNow * 60_000).toISOString();
}

vi.mock("@/server/bus/trias/trip-service", () => ({
  fetchTriasTrips: vi.fn(async () => ({
    ok: true,
    isTestData: false,
    fetchedAt: NOW.toISOString(),
    trips: [
      {
        interchanges: 0,
        durationIso: "PT20M",
        legs: [
          {
            type: "TRANSIT",
            from: "Start",
            to: "Ziel",
            fromRef: "a",
            toRef: "b",
            line: "170",
            direction: "Ziel",
            depPlannedIso: futureIso(5),
            depEstimatedIso: null,
            arrPlannedIso: futureIso(25),
            arrEstimatedIso: null,
            cancelled: false,
            durationIso: "PT20M",
          },
        ],
      },
    ],
  })),
}));

function person(id: "heidi" | "birgit", desiredArrivalHHmm: string): PersonProfile {
  return {
    id,
    name: id === "heidi" ? "Heidi" : "Birgit",
    avatar: id === "heidi" ? "H" : "B",
    hint: "",
    greeting: "",
    accent: "",
    schedule: { type: "work", week: {} },
    appointments: [],
    tasks: [],
    defaultBringItems: [],
    weather: { summary: "", temperatureC: 10, clothingTip: "" },
    personalSettings: {},
    displayPrefs: {} as never,
    busStop: { name: "Halt", departures: [], externalId: "orig" },
    transitPrefs: { leadTimeMinutes: 30, desiredArrivalHHmm },
  };
}

describe("planHeidiTripTravel — must use the real resolved work shift, not the static preference", () => {
  it("aims the commute at the passed workStart/workEnd, ignoring the stale transitPrefs.desiredArrivalHHmm", async () => {
    const { planHeidiTripTravel } = await import("@/server/bus/trip-travel");
    // Preference says 09:00 (generic/admin default) — the REAL dated shift says 07:15–15:00.
    const p = person("heidi", "09:00");
    const result = await planHeidiTripTravel(p, NOW, "07:15", "15:00");
    expect(result.plan).not.toBeNull();
    expect(result.plan?.workStart).toBe("07:15");
    expect(result.plan?.workEnd).toBe("15:00");
  });

  it("has parity with planBirgitTripTravel for the same explicit shift and signature", async () => {
    const { planHeidiTripTravel, planBirgitTripTravel } = await import(
      "@/server/bus/trip-travel"
    );
    const [heidiResult, birgitResult] = await Promise.all([
      planHeidiTripTravel(person("heidi", "09:00"), NOW, "07:15", "15:00"),
      planBirgitTripTravel(person("birgit", "09:00"), NOW, "07:15", "15:00"),
    ]);
    expect(heidiResult.plan?.workStart).toBe(birgitResult.plan?.workStart);
    expect(heidiResult.plan?.workEnd).toBe(birgitResult.plan?.workEnd);
    expect(heidiResult.plan?.workStart).toBe("07:15");
    expect(heidiResult.plan?.workEnd).toBe("15:00");
  });

  it("never invents a workEnd when the caller genuinely has none (e.g. schedule not yet resolved to an end time)", async () => {
    const { planHeidiTripTravel } = await import("@/server/bus/trip-travel");
    const result = await planHeidiTripTravel(person("heidi", "09:00"), NOW, "07:15", null);
    expect(result.plan?.workEnd).toBeNull();
  });
});
