import type { WeatherServiceProvider, WeatherQuery } from "@/server/weather/types";
import type { WeatherSnapshot } from "@/lib/types";
import { clothingRecommendation, toWeatherSnapshot } from "@/lib/weather/clothing";

export class MockWeatherServiceProvider implements WeatherServiceProvider {
  readonly name = "mock";

  async getWeather(query: WeatherQuery): Promise<WeatherSnapshot> {
    if (query.fallback) {
      return {
        ...query.fallback,
        clothingTip:
          query.fallback.clothingTip ||
          clothingRecommendation({ temperatureC: query.fallback.temperatureC }),
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
      rainMm: 0,
      source: "local",
    });
  }
}
