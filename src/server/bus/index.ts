import type { BusProvider } from "@/server/bus/types";
import { LocalBusProvider } from "@/server/bus/local";
import { WienerLinienBusProvider } from "@/server/bus/wienerlinien";

/**
 * BUS_PROVIDER:
 * - mock|local → always local timetable
 * - wienerlinien → try live when RBL present, else local
 * - auto (default) → wienerlinien if externalId, else local
 */
export function createBusProvider(preferLive = true): BusProvider {
  const mode = (process.env.BUS_PROVIDER || "auto").toLowerCase();
  if (mode === "mock" || mode === "local") {
    return new LocalBusProvider();
  }
  if (mode === "wienerlinien" || (mode === "auto" && preferLive)) {
    return new WienerLinienBusProvider();
  }
  return new LocalBusProvider();
}

export type { BusProvider, BusProviderResult, BusQuery } from "@/server/bus/types";
