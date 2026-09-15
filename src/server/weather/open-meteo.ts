import type { WeatherServiceProvider, WeatherQuery } from "@/server/weather/types";
import type { WeatherDayGlance, WeatherSnapshot, WeekdayKey } from "@/lib/types";
import {
  clampRainProbPct,
  clothingRecommendation,
  isValidTempC,
  pickNearestAfternoonTemp,
  pickNearestHourIndex,
  toWeatherSnapshot,
  weatherCodeLabel,
} from "@/lib/weather/clothing";

const JS_DAY_TO_KEY: WeekdayKey[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

function weekdayFromIso(dateIso: string): WeekdayKey | undefined {
  const d = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return JS_DAY_TO_KEY[d.getDay()];
}

function buildWeekGlance(daily: {
  time?: string[];
  temperature_2m_max?: Array<number | null>;
  weather_code?: Array<number | null>;
  precipitation_probability_max?: Array<number | null>;
}): WeatherDayGlance[] | undefined {
  const times = daily.time;
  if (!times?.length) return undefined;
  const out: WeatherDayGlance[] = [];
  for (let i = 0; i < Math.min(times.length, 7); i++) {
    const dateIso = times[i];
    if (!dateIso) continue;
    const temp = daily.temperature_2m_max?.[i];
    const code = daily.weather_code?.[i];
    const rain = daily.precipitation_probability_max?.[i];
    out.push({
      dateIso,
      weekdayKey: weekdayFromIso(dateIso),
      tempMaxC: isValidTempC(temp) ? Math.round(temp) : undefined,
      weatherCode:
        typeof code === "number" && Number.isFinite(code) ? code : undefined,
      rainProbPct: clampRainProbPct(rain),
    });
  }
  return out.length ? out : undefined;
}

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
      hourly:
        "temperature_2m,weather_code,precipitation_probability",
      daily:
        "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,precipitation_probability_max",
      timezone: "Europe/Vienna",
      forecast_days: "7",
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
          time?: string;
        };
        hourly?: {
          time?: string[];
          temperature_2m?: Array<number | null>;
          weather_code?: Array<number | null>;
          precipitation_probability?: Array<number | null>;
        };
        daily?: {
          time?: string[];
          temperature_2m_max?: Array<number | null>;
          temperature_2m_min?: Array<number | null>;
          precipitation_sum?: Array<number | null>;
          weather_code?: Array<number | null>;
          precipitation_probability_max?: Array<number | null>;
        };
      };

      const temp = json.current?.temperature_2m;
      if (typeof temp !== "number" || !Number.isFinite(temp)) {
        throw new Error("Keine Temperatur");
      }

      const code = json.current?.weather_code ?? 1;
      const rain =
        json.current?.precipitation ?? json.daily?.precipitation_sum?.[0] ?? 0;
      const tip = clothingRecommendation({
        temperatureC: temp,
        rainMm: rain,
        weatherCode: code,
      });
      const afternoon = pickNearestAfternoonTemp(
        json.hourly?.time,
        json.hourly?.temperature_2m,
        14,
      );

      // Rain “jetzt”: nearest hourly sample to current hour.
      const nowHour = json.current?.time
        ? Number(/T(\d{2}):/.exec(json.current.time)?.[1] ?? new Date().getHours())
        : new Date().getHours();
      const nowIdx = pickNearestHourIndex(json.hourly?.time, nowHour, 90);
      const rainNow =
        nowIdx >= 0
          ? clampRainProbPct(json.hourly?.precipitation_probability?.[nowIdx])
          : undefined;

      const rainAfternoon =
        afternoon && afternoon.index >= 0
          ? clampRainProbPct(
              json.hourly?.precipitation_probability?.[afternoon.index],
            )
          : undefined;
      const codeAfternoon =
        afternoon && afternoon.index >= 0
          ? json.hourly?.weather_code?.[afternoon.index]
          : undefined;

      return toWeatherSnapshot({
        temperatureC: temp,
        summary: weatherCodeLabel(code),
        clothingTip: tip,
        rainMm: rain,
        tempMaxC: json.daily?.temperature_2m_max?.[0] ?? undefined,
        tempMinC: json.daily?.temperature_2m_min?.[0] ?? undefined,
        afternoonTempC: afternoon?.tempC,
        afternoonLabel: afternoon?.label,
        weatherCode: code,
        rainProbPct: rainNow,
        afternoonRainProbPct: rainAfternoon,
        afternoonWeatherCode:
          typeof codeAfternoon === "number" && Number.isFinite(codeAfternoon)
            ? codeAfternoon
            : undefined,
        week: buildWeekGlance(json.daily ?? {}),
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
        summary: "Wetter momentan nicht verfügbar",
        clothingTip: clothingRecommendation({ temperatureC: 12 }),
        source: "local",
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
