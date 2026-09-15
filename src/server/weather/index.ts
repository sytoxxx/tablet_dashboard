import type { WeatherServiceProvider } from "@/server/weather/types";
import { OpenMeteoWeatherProvider } from "@/server/weather/open-meteo";
import { MockWeatherServiceProvider } from "@/server/weather/mock";

/**
 * WEATHER_PROVIDER:
 * - open-meteo (default) → real Open-Meteo
 * - mock → profile fallback only
 */
export function createWeatherProvider(): WeatherServiceProvider {
  const mode = (process.env.WEATHER_PROVIDER || "open-meteo").toLowerCase();
  if (mode === "mock") return new MockWeatherServiceProvider();
  return new OpenMeteoWeatherProvider();
}

export type { WeatherServiceProvider, WeatherQuery } from "@/server/weather/types";
