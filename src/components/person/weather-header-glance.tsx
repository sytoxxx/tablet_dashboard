import type { WeatherInfo, WeatherDayGlance } from "@/lib/types";
import {
  isValidTempC,
  shortWeatherClothingTip,
  weatherCodeEmoji,
} from "@/lib/weather/clothing";
import { cn } from "@/lib/utils";

function rainLabel(pct: number | undefined): string | null {
  if (pct === undefined) return null;
  return `${pct}% Regen`;
}

function tomorrowIso(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function pickTomorrowGlance(
  week: WeatherDayGlance[] | null | undefined,
  from = new Date(),
): WeatherDayGlance | null {
  if (!week?.length) return null;
  const iso = tomorrowIso(from);
  return week.find((d) => d.dateIso === iso) ?? null;
}

/**
 * Compact weather for header top-right — temp + emoji, ~14:00, rain %, short tip.
 * No card chrome. Does not invent temps; evening prefers tomorrow max when known.
 */
export function WeatherHeaderGlance({
  weather,
  focusTomorrow = false,
  now,
  className,
}: {
  weather: WeatherInfo | null;
  focusTomorrow?: boolean;
  now?: Date;
  className?: string;
}) {
  const wall = now ?? new Date();
  const week = weather?.week?.length ? weather.week : null;
  const tomorrow = focusTomorrow ? pickTomorrowGlance(week, wall) : null;
  const useTomorrow = Boolean(tomorrow && isValidTempC(tomorrow.tempMaxC));

  const primaryTemp = useTomorrow
    ? tomorrow!.tempMaxC!
    : weather?.temperatureC;
  const hasNow = isValidTempC(primaryTemp);

  const afternoonTemp = useTomorrow ? undefined : weather?.afternoonTempC;
  const afternoonLabel = weather?.afternoonLabel?.trim() || "14:00";
  const hasAfternoon = isValidTempC(afternoonTemp);

  const primaryCode = useTomorrow
    ? tomorrow!.weatherCode
    : weather?.weatherCode;
  const nowEmoji = weatherCodeEmoji(primaryCode);
  const afternoonEmoji = weatherCodeEmoji(
    weather?.afternoonWeatherCode ?? weather?.weatherCode,
  );

  const rainNow = useTomorrow ? tomorrow!.rainProbPct : weather?.rainProbPct;

  const shortTip = hasNow
    ? shortWeatherClothingTip({
        temperatureC: primaryTemp!,
        rainMm: useTomorrow ? undefined : weather?.rainMm,
        weatherCode: primaryCode,
      })
    : null;

  if (!hasNow) {
    return (
      <div
        className={cn(
          "text-right text-sm text-[color:var(--quiet)]",
          className,
        )}
      >
        Wetter momentan nicht verfügbar.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "max-w-[16rem] text-right sm:max-w-[18rem]",
        className,
      )}
      aria-label={useTomorrow ? "Wetter morgen" : "Wetter"}
    >
      <p className="font-display text-3xl tabular-nums tracking-tight sm:text-4xl landscape-tablet:text-[2.35rem]">
        <span className="mr-1 text-2xl sm:text-3xl" aria-hidden>
          {nowEmoji}
        </span>
        {Math.round(primaryTemp!)}°
        {hasAfternoon ? (
          <span className="ml-2 text-lg font-normal text-[color:var(--quiet)] sm:text-xl landscape-tablet:text-lg">
            <span aria-hidden>{afternoonEmoji}</span>{" "}
            <span className="tabular-nums">{Math.round(afternoonTemp!)}°</span>
            <span className="ml-1 text-sm tracking-normal">
              {afternoonLabel}
            </span>
          </span>
        ) : null}
      </p>
      <p className="mt-0.5 text-xs text-[color:var(--quiet)] sm:text-sm">
        {useTomorrow ? "Morgen" : "Jetzt"}
        {rainLabel(rainNow) ? ` · ${rainLabel(rainNow)}` : ""}
      </p>
      {shortTip ? (
        <p className="mt-1 text-sm leading-snug text-[color:var(--ink)] landscape-tablet:text-[0.8125rem]">
          {shortTip}
        </p>
      ) : null}
    </div>
  );
}
