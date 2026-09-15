import type { WeatherInfo, WeatherDayGlance } from "@/lib/types";
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

/**
 * Weather for all profiles: current + ~14:00, rain %, emoji, short tip,
 * compact Wochenwetter. Detailed Kleidung only when showDetailedClothing.
 * Evening (focusTomorrow): prefer tomorrow glance from week when present.
 */
export function WeatherSection({
  weather,
  showDetailedClothing = false,
  emphasis = "secondary",
  showWeekStrip = true,
  focusTomorrow = false,
  className,
}: {
  weather: WeatherInfo | null;
  simple?: boolean;
  place?: string | null;
  showClothingTip?: boolean;
  showDetailedClothing?: boolean;
  /** Compact Mo–So strip (all profiles). */
  showWeekStrip?: boolean;
  /** Evening / night: surface tomorrow when week data exists. */
  focusTomorrow?: boolean;
  emphasis?: ClarityEmphasis;
  className?: string;
}) {
  const week = weather?.week?.length ? weather.week : null;
  const tomorrow = focusTomorrow ? pickTomorrowGlance(week) : null;

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

  const todayKey = getWeekdayKey(new Date());
  const weatherTitle = useTomorrow ? "Wetter morgen" : "Wetter";
  const primaryLabel = useTomorrow ? "Morgen" : "Jetzt";
  const clothingTitle = useTomorrow ? "Kleidung morgen" : "Kleidung";

  return (
    <div className={cn("space-y-4", className)}>
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

      {showWeekStrip && week ? (
        <Section title="Wetter diese Woche" emphasis="tertiary">
          <ul
            className="grid grid-cols-7 gap-1"
            aria-label="Wetter diese Woche"
          >
            {week.slice(0, 7).map((d) => {
              const key = d.weekdayKey ?? todayKey;
              const isoToday = new Date().toISOString().slice(0, 10);
              const isToday =
                d.weekdayKey === todayKey || d.dateIso === isoToday;
              const isTomorrow = d.dateIso === tomorrowIso();
              return (
                <li
                  key={d.dateIso}
                  className={cn(
                    "min-w-0 rounded-xl border px-0.5 py-2 text-center",
                    (focusTomorrow ? isTomorrow : isToday)
                      ? "border-[color:var(--ink)]/25 bg-[color:var(--surface)]"
                      : "border-[color:var(--hairline)]",
                  )}
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--quiet)]">
                    {SHORT[key] ?? "–"}
                  </p>
                  <p className="mt-1 text-base" aria-hidden>
                    {weatherCodeEmoji(d.weatherCode)}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-[color:var(--ink)]">
                    {isValidTempC(d.tempMaxC) ? `${d.tempMaxC}°` : "–"}
                  </p>
                  {d.rainProbPct !== undefined ? (
                    <p className="text-[0.6rem] tabular-nums text-[color:var(--quiet)]">
                      {d.rainProbPct}%
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {detailed ? (
        <Section title={clothingTitle} emphasis="tertiary">
          <p className="text-xl font-medium text-[color:var(--ink)]">
            {detailed}
          </p>
        </Section>
      ) : null}
    </div>
  );
}
