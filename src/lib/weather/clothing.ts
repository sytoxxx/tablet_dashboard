import type { WeatherSnapshot } from "@/lib/types";

function isSnow(code?: number): boolean {
  return code !== undefined && code >= 71 && code <= 77;
}

function isHeavyRain(code?: number, rainMm?: number): boolean {
  if ((rainMm ?? 0) >= 4) return true;
  return (
    code !== undefined &&
    ((code >= 63 && code <= 67) || (code >= 80 && code <= 82) || code >= 95)
  );
}

function isRain(code?: number, rainMm?: number): boolean {
  if ((rainMm ?? 0) > 0.2) return true;
  return (
    code !== undefined &&
    ((code >= 51 && code <= 67) ||
      (code >= 80 && code <= 82) ||
      code === 95)
  );
}

/**
 * Short everyday clothing tip for the morning dashboard.
 * Examples: Regen → Jacke, kalt → warme Jacke, heiß → leichte Kleidung.
 */
export function clothingRecommendation(input: {
  temperatureC: number;
  rainMm?: number;
  weatherCode?: number;
}): string {
  const snow = isSnow(input.weatherCode);
  const heavy = isHeavyRain(input.weatherCode, input.rainMm);
  const raining = isRain(input.weatherCode, input.rainMm);

  if (snow) {
    return "❄ Warme Kleidung";
  }
  if (heavy) {
    return "🌧 Regenjacke mitnehmen";
  }
  if (raining && input.temperatureC <= 8) {
    return "🌦 Jacke und Regenschirm";
  }
  if (raining) {
    return "🌦 Leichter Regen möglich → Jacke mitnehmen";
  }
  if (input.temperatureC <= 5) {
    return "🧥 Warme Jacke mitnehmen";
  }
  if (input.temperatureC <= 14) {
    return "🧥 Jacke mitnehmen";
  }
  if (input.temperatureC <= 22) {
    return "👕 Leichte Jacke reicht";
  }
  return "☀️ Leichte Kleidung";
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
