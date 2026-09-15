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
  /** When this provider response was obtained. */
  fetchedAt?: string;
  /**
   * When realtime samples in this response were produced (if known).
   * Omit when only timetable / testdata — do not pretend cache is live.
   */
  realtimeAt?: string;
};

export type StopSearchHit = {
  /** Original provider stop id (StopPointRef / VAO id / RBL) — never invent. */
  id: string;
  name: string;
  /** @deprecated prefer locality */
  place?: string;
  locality?: string;
  latitude?: number;
  longitude?: number;
  provider: BusProviderId | string;
};

export interface BusProvider {
  readonly name: BusProviderId | string;
  getDepartures(query: BusQuery): Promise<BusProviderResult>;
}
