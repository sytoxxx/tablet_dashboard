import type { WeatherInfo, PersonId } from "@/lib/types";

export type WeatherQuery = {
  personId: PersonId;
  date: Date;
  /** Fallback from person profile when provider has no override. */
  fallback: WeatherInfo | null;
};

/** Swap for a live API later — UI stays unaware. */
export interface WeatherProvider {
  getWeather(query: WeatherQuery): WeatherInfo | null;
}

export class MockWeatherProvider implements WeatherProvider {
  getWeather(query: WeatherQuery): WeatherInfo | null {
    if (!query.fallback) return null;
    // Slight day-index variation without inventing unrelated facts.
    const day = query.date.getDate();
    const delta = (day % 3) - 1;
    return {
      ...query.fallback,
      temperatureC: query.fallback.temperatureC + delta,
    };
  }
}

let weatherProvider: WeatherProvider = new MockWeatherProvider();

export function setWeatherProvider(provider: WeatherProvider) {
  weatherProvider = provider;
}

export function getWeatherProvider(): WeatherProvider {
  return weatherProvider;
}
