import type { BusProvider, BusProviderResult, BusQuery } from "@/server/bus/types";

/** Local timetable / mock — no network. Always Testdaten. */
export class LocalBusProvider implements BusProvider {
  readonly name: string = "local";

  async getDepartures(query: BusQuery): Promise<BusProviderResult> {
    return {
      stopName: query.stopName,
      departures: query.localDepartures,
      source: "local",
      provider: this.name,
      isTestData: true,
      warning:
        query.localDepartures.length > 0
          ? "Lokale Testdaten — keine Live-Abfahrten."
          : "Keine lokalen Abfahrten konfiguriert.",
    };
  }
}

/** Alias for explicit mock mode. */
export class MockBusProvider extends LocalBusProvider {
  override readonly name = "mock";
}
