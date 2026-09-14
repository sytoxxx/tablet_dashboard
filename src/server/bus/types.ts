import type { LiveDeparture } from "@/lib/bus/select";

export type BusProviderId =
  | "auto"
  | "verbund-steiermark"
  | "vao"
  | "wienerlinien"
  | "local"
  | "mock";

export type BusQuery = {
  stopName: string;
  /**
   * Provider-specific stop reference:
   * - Verbund Steiermark TRIAS: StopPointRef
   * - VAO START: stop id
   * - Wiener Linien: numeric RBL
   */
  externalId?: string;
  localDepartures: LiveDeparture[];
  preferredLines?: string[];
  destinationHint?: string;
};

export type BusProviderResult = {
  stopName: string;
  departures: LiveDeparture[];
  source: "live" | "local";
  provider: BusProviderId | string;
  warning?: string;
  /** True when result is local/mock Testdaten — never label as live. */
  isTestData?: boolean;
};

export type StopSearchHit = {
  id: string;
  name: string;
  place?: string;
  provider: BusProviderId | string;
};

export interface BusProvider {
  readonly name: BusProviderId | string;
  getDepartures(query: BusQuery): Promise<BusProviderResult>;
}
