import type { WeatherServiceProvider, WeatherQuery } from "@/server/weather/types";
import type { WeatherSnapshot } from "@/lib/types";
import {
  clothingRecommendation,
  toWeatherSnapshot,
  weatherCodeLabel,
} from "@/lib/weather/clothing";

/**
 * Open-Meteo forecast API — free, no API key (non-commercial fair use).
 * https://open-meteo.com/
 */
export class OpenMeteoWeatherProvider implements WeatherServiceProvider {
  readonly name = "open-meteo";

  async getWeather(query: WeatherQuery): Promise<WeatherSnapshot> {
    const params = new URLSearchParams({
      latitude: String(query.latitude),
      longitude: String(query.longitude),
      current: "temperature_2m,weather_code,precipitation",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
      timezone: "Europe/Vienna",
      forecast_days: "1",
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        current?: {
          temperature_2m?: number;
          weather_code?: number;
          precipitation?: number;
        };
        daily?: {
          temperature_2m_max?: number[];
          temperature_2m_min?: number[];
          precipitation_sum?: number[];
        };
      };

      const temp = json.current?.temperature_2m;
      if (typeof temp !== "number") throw new Error("Keine Temperatur");

      const code = json.current?.weather_code ?? 1;
      const rain =
        json.current?.precipitation ?? json.daily?.precipitation_sum?.[0] ?? 0;
      const tip = clothingRecommendation({
        temperatureC: temp,
        rainMm: rain,
        weatherCode: code,
      });

      return toWeatherSnapshot({
        temperatureC: temp,
        summary: weatherCodeLabel(code),
        clothingTip: tip,
        rainMm: rain,
        tempMaxC: json.daily?.temperature_2m_max?.[0],
        tempMinC: json.daily?.temperature_2m_min?.[0],
        source: "live",
      });
    } catch {
      if (query.fallback) {
        return {
          ...query.fallback,
          source: "cache",
          fetchedAt: query.fallback.fetchedAt ?? new Date().toISOString(),
        };
      }
      return toWeatherSnapshot({
        temperatureC: 12,
        summary: "Wetter gerade nicht verfügbar",
        clothingTip: "🧥 Jacke empfohlen",
        source: "local",
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
