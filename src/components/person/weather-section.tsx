import type { WeatherDayGlance, WeatherInfo } from "@/lib/types";
import { Section } from "@/components/section";
import type { ClarityEmphasis } from "@/components/clarity-block";
import {
  detailedClothingLayers,
  isValidTempC,
  shortWeatherClothingTip,
  weatherCodeEmoji,
} from "@/lib/weather/clothing";
import { getWeekdayKey } from "@/lib/format";
import { cn } from "@/lib/utils";

const SHORT: Record<string, string> = {
  mon: "Mo",
  tue: "Di",
  wed: "Mi",
  thu: "Do",
  fri: "Fr",
  sat: "Sa",
  sun: "So",
};

function rainLabel(pct: number | undefined): string | null {
  if (pct === undefined) return null;
  return `${pct}% Regen`;
}

function tomorrowIso(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Prefer real week-row for tomorrow — never invents temps. */
function pickTomorrowGlance(
  week: WeatherDayGlance[] | null | undefined,
  from = new Date(),
): WeatherDayGlance | null {
  if (!week?.length) return null;
  const iso = tomorrowIso(from);
  return week.find((d) => d.dateIso === iso) ?? null;
}

/** Display-only: high, or high / low when both known — never invents. */
export function formatWeekDayTemps(d: WeatherDayGlance): string {
  const hasMax = isValidTempC(d.tempMaxC);
  const hasMin = isValidTempC(d.tempMinC);
  if (hasMax && hasMin) return `${d.tempMaxC}° / ${d.tempMinC}°`;
  if (hasMax) return `${d.tempMaxC}°`;
  if (hasMin) return `${d.tempMinC}°`;
  return "–";
}

export function formatWeekDayRain(pct: number | undefined): string {
  if (pct === undefined) return "–";
  return `${pct} %`;
}

/**
 * Calm Mo–So list (not seven cards):
 *   MO   ☀️   18° / 9°    10 %
 */
export function WeatherWeekList({
  week,
  now,
  focusTomorrow = false,
  className,
}: {
  week: WeatherDayGlance[];
  now?: Date;
  focusTomorrow?: boolean;
  className?: string;
}) {
  const wall = now ?? new Date();
  const todayKey = getWeekdayKey(wall);
  const isoToday = wall.toISOString().slice(0, 10);
  const isoTomorrow = tomorrowIso(wall);

  return (
    <ul
      className={cn("flex flex-col gap-0", className)}
      aria-label="Wetter diese Woche"
    >
      {week.slice(0, 7).map((d) => {
        const key = d.weekdayKey ?? todayKey;
        const isToday = d.weekdayKey === todayKey || d.dateIso === isoToday;
        const isTomorrow = d.dateIso === isoTomorrow;
        const active = focusTomorrow ? isTomorrow : isToday;
        return (
          <li
            key={d.dateIso}
            className={cn(
              "grid grid-cols-[2.25rem_1.75rem_minmax(0,1fr)_3.25rem] items-center gap-x-2 border-b border-[color:var(--hairline)]/70 py-1.5 text-base last:border-b-0 landscape-tablet:py-1 landscape-tablet:text-[0.9375rem]",
              active && "font-medium text-[color:var(--ink)]",
              !active && "text-[color:var(--ink)]",
            )}
          >
            <span
              className={cn(
                "text-sm font-semibold uppercase tracking-wide",
                active
                  ? "text-[color:var(--ink)]"
                  : "text-[color:var(--quiet)]",
              )}
            >
              {SHORT[key] ?? "–"}
            </span>
            <span className="text-center text-lg leading-none" aria-hidden>
              {weatherCodeEmoji(d.weatherCode)}
            </span>
            <span className="tabular-nums tracking-tight">
              {formatWeekDayTemps(d)}
            </span>
            <span className="text-right tabular-nums text-[color:var(--quiet)]">
              {formatWeekDayRain(d.rainProbPct)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Weather for all profiles: current + ~14:00, rain %, emoji, short tip,
 * calm Wochenwetter list. Detailed Kleidung only when showDetailedClothing.
 * Evening (focusTomorrow): prefer tomorrow glance from week when present.
 */
export function WeatherSection({
  weather,
  showDetailedClothing = false,
  emphasis = "secondary",
  showWeekStrip = true,
  showCurrent = true,
  focusTomorrow = false,
  now,
  className,
}: {
  weather: WeatherInfo | null;
  simple?: boolean;
  place?: string | null;
  showClothingTip?: boolean;
  showDetailedClothing?: boolean;
  /** Compact Mo–So list (all profiles). */
  showWeekStrip?: boolean;
  /** Current / afternoon / tip / clothing. Set false to render week list alone. */
  showCurrent?: boolean;
  /** Evening / night: surface tomorrow when week data exists. */
  focusTomorrow?: boolean;
  /** Wall / DevTime clock — used for today/tomorrow highlight. */
  now?: Date;
  emphasis?: ClarityEmphasis;
  className?: string;
}) {
  const wall = now ?? new Date();
  const week = weather?.week?.length ? weather.week : null;
  const tomorrow = focusTomorrow ? pickTomorrowGlance(week, wall) : null;

  // Evening: show tomorrow max when known; otherwise fall back to current (honest).
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
  const rainAfternoon = useTomorrow
    ? undefined
    : weather?.afternoonRainProbPct;

  const shortTip = hasNow
    ? shortWeatherClothingTip({
        temperatureC: primaryTemp!,
        rainMm: useTomorrow ? undefined : weather?.rainMm,
        weatherCode: primaryCode,
      })
    : null;

  const detailed =
    showDetailedClothing && hasNow
      ? detailedClothingLayers({
          temperatureC: primaryTemp!,
          rainMm: useTomorrow ? undefined : weather?.rainMm,
          weatherCode: primaryCode,
        })
      : null;

  const weatherTitle = useTomorrow ? "Wetter morgen" : "Wetter";
  const primaryLabel = useTomorrow ? "Morgen" : "Jetzt";
  const clothingTitle = useTomorrow ? "Kleidung morgen" : "Kleidung";

  if (!showCurrent && !(showWeekStrip && week)) {
    if (showWeekStrip && !week) {
      return (
        <Section title="Wetter diese Woche" emphasis="tertiary" className={className}>
          <p className="text-base text-[color:var(--quiet)]">
            Wochenwetter momentan nicht verfügbar.
          </p>
        </Section>
      );
    }
    return null;
  }

  return (
    <div className={cn(showCurrent && showWeekStrip ? "space-y-5" : undefined, className)}>
      {showCurrent ? (
        <Section title={weatherTitle} emphasis={emphasis}>
          {hasNow ? (
            <div>
              <div
                className={cn(
                  "grid gap-6",
                  hasAfternoon ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                <div>
                  <p className="font-display text-5xl tabular-nums tracking-tight sm:text-6xl">
                    <span className="mr-1 text-4xl sm:text-5xl" aria-hidden>
                      {nowEmoji}
                    </span>
                    {Math.round(primaryTemp!)}°
                  </p>
                  <p className="mt-2 text-base text-[color:var(--quiet)]">
                    {primaryLabel}
                  </p>
                  {rainLabel(rainNow) ? (
                    <p className="mt-1 text-sm text-[color:var(--quiet)]">
                      {rainLabel(rainNow)}
                    </p>
                  ) : null}
                </div>
                {hasAfternoon ? (
                  <div>
                    <p className="font-display text-5xl tabular-nums tracking-tight sm:text-6xl">
                      <span className="mr-1 text-4xl sm:text-5xl" aria-hidden>
                        {afternoonEmoji}
                      </span>
                      {Math.round(afternoonTemp!)}°
                    </p>
                    <p className="mt-2 text-base text-[color:var(--quiet)]">
                      {afternoonLabel}
                    </p>
                    {rainLabel(rainAfternoon) ? (
                      <p className="mt-1 text-sm text-[color:var(--quiet)]">
                        {rainLabel(rainAfternoon)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {shortTip ? (
                <p className="mt-5 text-lg text-[color:var(--ink)]">{shortTip}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-lg text-[color:var(--quiet)]">
              Wetter momentan nicht verfügbar.
            </p>
          )}
        </Section>
      ) : null}

      {showWeekStrip && week ? (
        <Section title="Wetter diese Woche" emphasis="tertiary">
          <WeatherWeekList
            week={week}
            now={wall}
            focusTomorrow={focusTomorrow}
          />
        </Section>
      ) : null}

      {showCurrent && detailed ? (
        <Section title={clothingTitle} emphasis="tertiary">
          <p className="text-xl font-medium text-[color:var(--ink)]">
            {detailed}
          </p>
        </Section>
      ) : null}
    </div>
  );
}
