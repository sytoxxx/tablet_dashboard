import type { BusInfo } from "@/lib/types";
import type {
  BusMorning,
  BusMorningStatus,
  BusTimingSource,
} from "@/lib/morning/types";

/**
 * Bus status for the Smart Morning Engine.
 *
 * Uses existing BusInfo from selectRelevantDeparture / useBusLive.
 * Does NOT invent travel times or delays.
 * Does NOT assume a bus is punctual — only reports what we know.
 */
export function resolveBusMorning(input: {
  enabled: boolean;
  bus: BusInfo | null;
  matchedToActivity?: boolean;
  /** Explicit test-data flag from live hook when bus object lacks it. */
  isTestData?: boolean;
}): BusMorning {
  if (!input.enabled) {
    return {
      enabled: false,
      bus: null,
      status: "disabled",
      message: "Kein Bus nötig",
      matchedToActivity: false,
      timingSource: "none",
      delayMinutes: null,
      cancelled: false,
      isTestData: false,
      displayDeparture: null,
      scheduleNote: null,
    };
  }

  if (!input.bus) {
    return {
      enabled: true,
      bus: null,
      status: "none",
      message: "Kein passender Bus",
      matchedToActivity: false,
      timingSource: "none",
      delayMinutes: null,
      cancelled: false,
      isTestData: Boolean(input.isTestData),
      displayDeparture: null,
      scheduleNote: null,
    };
  }

  const bus = input.bus;
  const matched =
    input.matchedToActivity === true || bus.matchedToWork === true;
  const delay =
    typeof bus.delayMinutes === "number" ? bus.delayMinutes : null;
  const cancelled = bus.cancelled === true;
  const isTestData =
    bus.isTestData === true ||
    input.isTestData === true ||
    bus.source === "local";
  const isRealtime = bus.isRealtime === true && !isTestData;
  const timingSource = resolveTimingSource(bus, isTestData, isRealtime);

  let status: BusMorningStatus = "unknown";
  let message = "";

  if (cancelled) {
    status = "cancelled";
    message = "Bus fällt aus";
  } else if (bus.arrivesInTime === false) {
    status = "too_late";
    message =
      delay !== null && delay > 0
        ? `Bus reicht nicht · ca. ${delay} Min. Verspätung`
        : "Bus reicht nicht";
  } else if (delay !== null && delay > 0) {
    status = "delayed";
    message =
      bus.arrivesInTime === true
        ? `ca. ${delay} Min. Verspätung · Du kommst noch rechtzeitig.`
        : `ca. ${delay} Min. Verspätung`;
  } else if (bus.arrivesInTime === true) {
    // Arrival-fit vs school/work — not a claim that the vehicle is “pünktlich”.
    status = "on_time";
    message = "Du kommst rechtzeitig an.";
  } else {
    status = "unknown";
    message = "";
  }

  const scheduleNote = noteForTimingSource(timingSource, isTestData);

  return {
    enabled: true,
    bus,
    status,
    message,
    matchedToActivity: matched,
    timingSource,
    delayMinutes: delay,
    cancelled,
    isTestData,
    displayDeparture: bus.departure,
    scheduleNote,
  };
}

function resolveTimingSource(
  bus: BusInfo,
  isTestData: boolean,
  isRealtime: boolean,
): BusTimingSource {
  if (isTestData) return "test";
  if (bus.source === "cache") return "cache";
  if (isRealtime || bus.source === "live") return "realtime";
  return "schedule";
}

function noteForTimingSource(
  source: BusTimingSource,
  isTestData: boolean,
): string | null {
  if (isTestData || source === "test") return "Testdaten";
  if (source === "realtime") return "Echtzeit";
  if (source === "schedule") return "Nach Fahrplan";
  if (source === "cache") return "Zuletzt gespeichert";
  return null;
}
