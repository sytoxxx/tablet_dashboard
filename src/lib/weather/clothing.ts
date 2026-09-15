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

export type WeatherTipInput = {
  temperatureC: number;
  rainMm?: number;
  weatherCode?: number;
};

/**
 * Short human jacket tip for the weather card (all profiles).
 * Examples: "Eine dünne Jacke reicht." / "Jacke empfehlenswert."
 */
export function shortWeatherClothingTip(input: WeatherTipInput): string {
  const snow = isSnow(input.weatherCode);
  const heavy = isHeavyRain(input.weatherCode, input.rainMm);
  const raining = isRain(input.weatherCode, input.rainMm);
  const t = input.temperatureC;

  if (snow) return "Warme Jacke empfehlenswert.";
  if (heavy) return "Regenjacke empfehlenswert.";
  if (raining && t <= 8) return "Jacke und Regenschirm mitnehmen.";
  if (raining) return "Jacke empfehlenswert.";
  if (t <= 5) return "Warme Jacke empfehlenswert.";
  if (t <= 12) return "Jacke empfehlenswert.";
  if (t <= 18) return "Eine dünne Jacke reicht.";
  if (t <= 24) return "Kein Mantel nötig.";
  return "Leichte Kleidung reicht.";
}

/**
 * @deprecated Prefer shortWeatherClothingTip — kept for summary/Jarvis callers.
 * Same short tip, historically emoji-prefixed in older UIs.
 */
export function clothingRecommendation(input: WeatherTipInput): string {
  return shortWeatherClothingTip(input);
}

/**
 * Levi-only multi-item clothing line derived from real weather thresholds.
 * Categories only — not a wardrobe inventory invent.
 */
export function detailedClothingLayers(input: WeatherTipInput): string {
  const snow = isSnow(input.weatherCode);
  const heavy = isHeavyRain(input.weatherCode, input.rainMm);
  const raining = isRain(input.weatherCode, input.rainMm);
  const t = input.temperatureC;

  let jacket: string;
  if (snow || t <= 5) jacket = "Warme Jacke";
  else if (heavy || raining) jacket = "Regenjacke";
  else if (t <= 12) jacket = "Jacke";
  else if (t <= 18) jacket = "Leichte Jacke";
  else jacket = "Leichtes Oberteil";

  const hose = t <= 8 ? "warme Hose" : "lange Hose";
  const shoes =
    snow || heavy || raining
      ? "feste Schuhe"
      : t >= 20
        ? "Sneaker"
        : "bequeme Schuhe";

  return `${jacket} · ${hose} · ${shoes}`;
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

/** True when a temperature is safe to show (never 0-by-accident from null/NaN). */
export function isValidTempC(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Pick the hourly sample nearest to 14:00 local (from Open-Meteo time strings).
 * Returns null when no usable samples — never invents a temperature.
 */
export function pickNearestAfternoonTemp(
  times: string[] | undefined,
  temps: Array<number | null | undefined> | undefined,
  targetHour = 14,
): { tempC: number; label: string } | null {
  if (!times?.length || !temps?.length) return null;

  let bestIdx = -1;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < times.length; i++) {
    const raw = temps[i];
    if (!isValidTempC(raw)) continue;
    const time = times[i];
    if (!time) continue;
    // Open-Meteo: "2026-09-15T14:00" (local when timezone set)
    const hourMatch = /T(\d{2}):(\d{2})/.exec(time);
    if (!hourMatch) continue;
    const hour = Number(hourMatch[1]);
    const minute = Number(hourMatch[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;
    const dist = Math.abs(hour * 60 + minute - targetHour * 60);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  // Accept within ±3 hours of 14:00 so we still label the real sample hour.
  if (bestIdx < 0 || bestDist > 3 * 60) return null;
  const temp = temps[bestIdx];
  if (!isValidTempC(temp)) return null;
  const hourMatch = /T(\d{2}):(\d{2})/.exec(times[bestIdx]!);
  if (!hourMatch) return null;
  return {
    tempC: Math.round(temp),
    label: `${hourMatch[1]}:${hourMatch[2]}`,
  };
}

export function resolveShortClothingTip(
  weather: Pick<WeatherSnapshot, "temperatureC" | "rainMm" | "clothingTip"> | null,
): string | null {
  if (!weather || !isValidTempC(weather.temperatureC)) return null;
  // Prefer freshly derived tip from live numbers; fall back to stored tip text.
  return shortWeatherClothingTip({
    temperatureC: weather.temperatureC,
    rainMm: weather.rainMm,
  });
}

export function toWeatherSnapshot(partial: {
  temperatureC: number;
  summary: string;
  clothingTip: string;
  rainMm?: number;
  tempMaxC?: number;
  tempMinC?: number;
  afternoonTempC?: number;
  afternoonLabel?: string;
  source?: WeatherSnapshot["source"];
}): WeatherSnapshot {
  return {
    temperatureC: Math.round(partial.temperatureC),
    summary: partial.summary,
    clothingTip: partial.clothingTip,
    rainMm: partial.rainMm,
    tempMaxC:
      partial.tempMaxC !== undefined ? Math.round(partial.tempMaxC) : undefined,
    tempMinC:
      partial.tempMinC !== undefined ? Math.round(partial.tempMinC) : undefined,
    afternoonTempC: isValidTempC(partial.afternoonTempC)
      ? Math.round(partial.afternoonTempC)
      : undefined,
    afternoonLabel: partial.afternoonLabel,
    fetchedAt: new Date().toISOString(),
    source: partial.source ?? "live",
  };
}
