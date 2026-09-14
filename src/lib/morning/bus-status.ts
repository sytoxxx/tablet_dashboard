import type { BusInfo } from "@/lib/types";
import type { BusMorning, BusMorningStatus } from "@/lib/morning/types";

/**
 * Bus status relative to the day’s next activity (school/work start).
 * Reuses existing BusInfo.arrivesInTime / matchedToWork — no new travel math.
 */
export function resolveBusMorning(input: {
  enabled: boolean;
  bus: BusInfo | null;
  matchedToActivity?: boolean;
}): BusMorning {
  if (!input.enabled) {
    return {
      enabled: false,
      bus: null,
      status: "disabled",
      message: "Kein Bus nötig",
      matchedToActivity: false,
    };
  }

  if (!input.bus) {
    return {
      enabled: true,
      bus: null,
      status: "none",
      message: "Kein passender Bus",
      matchedToActivity: false,
    };
  }

  const matched =
    input.matchedToActivity === true || input.bus.matchedToWork === true;
  const arrives = input.bus.arrivesInTime;

  let status: BusMorningStatus = "unknown";
  let message = "";

  if (arrives === false) {
    status = "too_late";
    message = "Bus reicht nicht";
  } else if (arrives === true || matched) {
    status = "on_time";
    message = "Du kommst rechtzeitig an.";
  } else {
    status = "unknown";
    message = "";
  }

  return {
    enabled: true,
    bus: input.bus,
    status,
    message,
    matchedToActivity: matched,
  };
}
