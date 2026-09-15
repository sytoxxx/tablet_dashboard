import type { WeatherServiceProvider, WeatherQuery } from "@/server/weather/types";
import type { WeatherSnapshot } from "@/lib/types";
import { clothingRecommendation, toWeatherSnapshot } from "@/lib/weather/clothing";

export class MockWeatherServiceProvider implements WeatherServiceProvider {
  readonly name = "mock";

  async getWeather(query: WeatherQuery): Promise<WeatherSnapshot> {
    if (query.fallback) {
      const tip =
        query.fallback.clothingTip ||
        clothingRecommendation({
          temperatureC: query.fallback.temperatureC,
          weatherCode: query.fallback.weatherCode,
        });
      return {
        ...query.fallback,
        clothingTip: tip,
        // Keep seed afternoon / rain / week when present — never invent here.
        afternoonTempC: query.fallback.afternoonTempC,
        afternoonLabel: query.fallback.afternoonLabel,
        weatherCode: query.fallback.weatherCode,
        rainProbPct: query.fallback.rainProbPct,
        afternoonRainProbPct: query.fallback.afternoonRainProbPct,
        afternoonWeatherCode: query.fallback.afternoonWeatherCode,
        week: query.fallback.week,
        source: "local",
        fetchedAt: new Date().toISOString(),
      };
    }
    return toWeatherSnapshot({
      temperatureC: 12,
      summary: "Leicht bewölkt",
      clothingTip: clothingRecommendation({ temperatureC: 12 }),
      tempMaxC: 15,
      tempMinC: 8,
      afternoonTempC: 15,
      afternoonLabel: "14:00",
      weatherCode: 2,
      rainProbPct: 10,
      afternoonRainProbPct: 15,
      rainMm: 0,
      source: "local",
    });
  }
}
