import type { WeatherSnapshot } from "@/lib/types";

/** Simple everyday clothing tip — short German copy. */
export function clothingRecommendation(input: {
  temperatureC: number;
  rainMm?: number;
  weatherCode?: number;
}): string {
  const raining =
    (input.rainMm ?? 0) > 0.2 ||
    (input.weatherCode !== undefined &&
      ((input.weatherCode >= 51 && input.weatherCode <= 67) ||
        (input.weatherCode >= 80 && input.weatherCode <= 82) ||
        input.weatherCode === 95));

  if (raining && input.temperatureC <= 8) {
    return "☔🧥 Regenschirm und warme Jacke empfohlen";
  }
  if (raining) {
    return "☔ Regenschirm empfohlen";
  }
  if (input.temperatureC <= 5) {
    return "🧥 Warme Jacke empfohlen";
  }
  if (input.temperatureC <= 14) {
    return "🧥 Jacke empfohlen";
  }
  if (input.temperatureC <= 22) {
    return "👕 Leichte Jacke reicht";
  }
  return "👕 Leichte Kleidung";
}

export function weatherCodeLabel(code: number): string {
  if (code === 0) return "Klar";
  if (code === 1 || code === 2) return "Leicht bewölkt";
  if (code === 3) return "Bewölkt";
  if (code === 45 || code === 48) return "Nebel";
  if (code >= 51 && code <= 57) return "Nieselregen";
  if (code >= 61 && code <= 67) return "Regen";
  if (code >= 71 && code <= 77) return "Schnee";
  if (code >= 80 && code <= 82) return "Schauer";
  if (code >= 95) return "Gewitter";
  return "Wechselhaft";
}

export function toWeatherSnapshot(partial: {
  temperatureC: number;
  summary: string;
  clothingTip: string;
  rainMm?: number;
  tempMaxC?: number;
  tempMinC?: number;
  source?: WeatherSnapshot["source"];
}): WeatherSnapshot {
  return {
    temperatureC: Math.round(partial.temperatureC),
    summary: partial.summary,
    clothingTip: partial.clothingTip,
    rainMm: partial.rainMm,
    tempMaxC: partial.tempMaxC !== undefined ? Math.round(partial.tempMaxC) : undefined,
    tempMinC: partial.tempMinC !== undefined ? Math.round(partial.tempMinC) : undefined,
    fetchedAt: new Date().toISOString(),
    source: partial.source ?? "live",
  };
}
