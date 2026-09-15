import { describe, expect, it } from "vitest";
import { getMinutesSinceMidnight, parseTimeToMinutes } from "@/lib/format";

/**
 * Mirrors trip-travel fitness rules (kept local so we don't export
 * private helpers). Guards against inventing punctuality.
 */
function computeArrivesInTime(
  arrivalHHmm: string | null,
  workStart: string | null,
  stopToWorkMinutes: number,
  safetyBufferMinutes: number,
): boolean | null {
  if (!workStart || !arrivalHHmm) return null;
  const target = parseTimeToMinutes(workStart);
  const arrival =
    parseTimeToMinutes(arrivalHHmm) +
    Math.max(0, stopToWorkMinutes) +
    Math.max(0, safetyBufferMinutes);
  return arrival <= target;
}

function minutesUntilDeparture(departureHHmm: string, now: Date): number {
  return parseTimeToMinutes(departureHHmm) - getMinutesSinceMidnight(now);
}

describe("trip-travel fitness honesty", () => {
  it("does not invent fit when arrival unknown", () => {
    expect(computeArrivesInTime(null, "07:00", 5, 5)).toBeNull();
  });

  it("does not invent fit when work start unknown", () => {
    expect(computeArrivesInTime("06:40", null, 5, 5)).toBeNull();
  });

  it("marks on-time when arrival + walk + buffer ≤ work start", () => {
    expect(computeArrivesInTime("06:40", "07:00", 5, 5)).toBe(true);
  });

  it("marks late when arrival + walk + buffer exceeds work start", () => {
    expect(computeArrivesInTime("06:55", "07:00", 5, 5)).toBe(false);
  });

  it("minutesUntil is wall-clock delta — not always 0", () => {
    const now = new Date();
    now.setHours(6, 0, 0, 0);
    expect(minutesUntilDeparture("06:30", now)).toBe(30);
    expect(minutesUntilDeparture("05:45", now)).toBe(-15);
  });
});

describe("commuteDepArrTimeIso", () => {
  it("aims before work start on the same Vienna day", async () => {
    const { commuteDepArrTimeIso } = await import("@/server/bus/trip-travel");
    // 2026-09-15 05:00 UTC = 07:00 Vienna (CEST)
    const now = new Date("2026-09-15T05:00:00Z");
    const iso = commuteDepArrTimeIso(now, "08:00");
    // Aim 08:00-90m = 06:30 Vienna → 04:30Z
    expect(iso).toBe("2026-09-15T04:30:00Z");
  });

  it("rolls to next day when work start already passed", async () => {
    const { commuteDepArrTimeIso } = await import("@/server/bus/trip-travel");
    // 15:00 Vienna-ish
    const now = new Date("2026-09-15T13:00:00Z");
    const iso = commuteDepArrTimeIso(now, "06:00");
    expect(iso).toBe("2026-09-16T02:30:00Z");
  });
});
