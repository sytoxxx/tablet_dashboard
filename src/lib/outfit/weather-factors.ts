/**
 * Weather → soft outfit factors. Never invents garments.
 */
import type { WeatherInfo } from "@/lib/types";
import type { WeatherOutfitFactors } from "@/lib/outfit/types";

export function buildWeatherOutfitFactors(
  weather: WeatherInfo | null | undefined,
): WeatherOutfitFactors {
  if (!weather) {
    return {
      morningTempC: null,
      daytimeTempC: null,
      rain: false,
      windy: false,
      warning: null,
      guidance: [],
    };
  }

  const temp = weather.temperatureC;
  const summary = `${weather.summary} ${weather.clothingTip ?? ""}`.toLowerCase();
  const rain = /regen|schauer|niederschlag|nass/.test(summary);
  const windy = /wind|stürm|stuerm/.test(summary);
  const guidance: string[] = [];

  if (typeof temp === "number") {
    if (temp <= 8) guidance.push("kühl → wärmere Schicht sinnvoll");
    else if (temp >= 22) guidance.push("warm → leichtere Kleidung sinnvoll");
  }

  if (rain) guidance.push("Regen → wetterfeste Schuhe / Jacke vorbereiten");
  if (windy) guidance.push("windig → windfeste Schicht sinnvoll");

  const tip = weather.clothingTip?.replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim();
  if (tip) guidance.push(tip);

  return {
    morningTempC: typeof temp === "number" ? temp : null,
    daytimeTempC: typeof temp === "number" ? temp : null,
    rain,
    windy,
    warning: null,
    guidance: [...new Set(guidance)],
  };
}
