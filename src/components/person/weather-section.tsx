import type { WeatherInfo } from "@/lib/types";
import { Section } from "@/components/section";
import type { ClarityEmphasis } from "@/components/clarity-block";
import {
  detailedClothingLayers,
  isValidTempC,
  shortWeatherClothingTip,
} from "@/lib/weather/clothing";
import { cn } from "@/lib/utils";

/**
 * Clean weather card for all profiles:
 *   WETTER
 *   18°        23°
 *   Jetzt      14:00
 *   Eine dünne Jacke reicht.
 *
 * Detailed clothing line is Levi-only via showDetailedClothing render gate.
 */
export function WeatherSection({
  weather,
  showDetailedClothing = false,
  emphasis = "secondary",
  className,
}: {
  weather: WeatherInfo | null;
  /** @deprecated Ignored — short tip always shown when weather is valid. */
  simple?: boolean;
  place?: string | null;
  /** @deprecated Use showDetailedClothing for Levi-only layers. */
  showClothingTip?: boolean;
  /** Multi-item Kleidung line — Levi only (render gate). */
  showDetailedClothing?: boolean;
  emphasis?: ClarityEmphasis;
  className?: string;
}) {
  const hasNow = weather != null && isValidTempC(weather.temperatureC);
  const afternoonTemp = weather?.afternoonTempC;
  const afternoonLabel = weather?.afternoonLabel?.trim() || "14:00";
  const hasAfternoon = isValidTempC(afternoonTemp);

  const shortTip = hasNow
    ? shortWeatherClothingTip({
        temperatureC: weather!.temperatureC,
        rainMm: weather!.rainMm,
      })
    : null;

  const detailed =
    showDetailedClothing && hasNow
      ? detailedClothingLayers({
          temperatureC: weather!.temperatureC,
          rainMm: weather!.rainMm,
        })
      : null;

  return (
    <div className={cn("space-y-4", className)}>
      <Section title="Wetter" emphasis={emphasis}>
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
                  {Math.round(weather!.temperatureC)}°
                </p>
                <p className="mt-2 text-base text-[color:var(--quiet)]">Jetzt</p>
              </div>
              {hasAfternoon ? (
                <div>
                  <p className="font-display text-5xl tabular-nums tracking-tight sm:text-6xl">
                    {Math.round(afternoonTemp!)}°
                  </p>
                  <p className="mt-2 text-base text-[color:var(--quiet)]">
                    {afternoonLabel}
                  </p>
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

      {detailed ? (
        <Section title="Kleidung" emphasis="tertiary">
          <p className="text-xl font-medium text-[color:var(--ink)]">{detailed}</p>
        </Section>
      ) : null}
    </div>
  );
}
