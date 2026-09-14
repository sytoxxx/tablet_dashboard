import type { BusProvider, BusProviderId, BusQuery } from "@/server/bus/types";
import { LocalBusProvider, MockBusProvider } from "@/server/bus/local";
import { VaoBusProvider, isVaoConfigured } from "@/server/bus/vao";
import {
  VerbundSteiermarkBusProvider,
  isSteiermarkConfigured,
} from "@/server/bus/verbund-steiermark";
import { WienerLinienBusProvider } from "@/server/bus/wienerlinien";

/**
 * Regional priority (Kapfenberg / Bruck / Apfelmoar — Zone 103):
 * 1. Verbund Steiermark TRIAS (primary)
 * 2. VAO START (Austria-wide, needs key)
 * 3. Wiener Linien (optional Vienna RBL only)
 * 4. Local/mock timetable
 *
 * Never fan out to multiple providers.
 */
export function resolveBusProviderMode(
  preferred?: BusProviderId | string | null,
): BusProviderId {
  if (
    preferred === "verbund-steiermark" ||
    preferred === "vao" ||
    preferred === "wienerlinien" ||
    preferred === "mock" ||
    preferred === "local"
  ) {
    return preferred;
  }
  const env = (process.env.BUS_PROVIDER || "auto").toLowerCase();
  if (
    env === "verbund-steiermark" ||
    env === "vao" ||
    env === "wienerlinien" ||
    env === "mock" ||
    env === "local" ||
    env === "auto"
  ) {
    return env;
  }
  return "auto";
}

function pickAuto(query: BusQuery): BusProvider {
  if (isSteiermarkConfigured()) {
    return new VerbundSteiermarkBusProvider();
  }
  if (isVaoConfigured()) {
    return new VaoBusProvider();
  }
  if (query.externalId && /^\d+$/.test(query.externalId.trim())) {
    return new WienerLinienBusProvider();
  }
  return new LocalBusProvider();
}

export function createBusProvider(
  preferred?: BusProviderId | string | null,
  query?: BusQuery,
): BusProvider {
  const mode = resolveBusProviderMode(preferred);
  switch (mode) {
    case "verbund-steiermark":
      return new VerbundSteiermarkBusProvider();
    case "vao":
      return new VaoBusProvider();
    case "wienerlinien":
      return new WienerLinienBusProvider();
    case "mock":
      return new MockBusProvider();
    case "local":
      return new LocalBusProvider();
    case "auto":
    default:
      return pickAuto(
        query ?? {
          stopName: "",
          localDepartures: [],
          externalId: undefined,
        },
      );
  }
}

export type { BusProvider, BusProviderResult, BusQuery, BusProviderId } from "@/server/bus/types";
export { isVaoConfigured } from "@/server/bus/vao";
export { isSteiermarkConfigured } from "@/server/bus/verbund-steiermark";
