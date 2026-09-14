import type { BusProvider, BusProviderResult, BusQuery } from "@/server/bus/types";

/** Uses the person's saved local timetable — no network. */
export class LocalBusProvider implements BusProvider {
  readonly name = "local";

  async getDepartures(query: BusQuery): Promise<BusProviderResult> {
    return {
      stopName: query.stopName,
      departures: query.localDepartures,
      source: "local",
      provider: this.name,
    };
  }
}
