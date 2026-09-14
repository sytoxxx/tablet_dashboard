import type { LiveDeparture } from "@/lib/bus/select";

export type BusQuery = {
  stopName: string;
  /** Wiener Linien RBL when using live Vienna feed. */
  externalId?: string;
  localDepartures: LiveDeparture[];
};

export type BusProviderResult = {
  stopName: string;
  departures: LiveDeparture[];
  source: "live" | "local";
  provider: string;
  warning?: string;
};

export interface BusProvider {
  readonly name: string;
  getDepartures(query: BusQuery): Promise<BusProviderResult>;
}
