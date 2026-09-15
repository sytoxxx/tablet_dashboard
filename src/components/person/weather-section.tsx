import type { WeatherInfo } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";
import type { ClarityEmphasis } from "@/components/clarity-block";

function rainOrDry(weather: WeatherInfo): string {
  if (typeof weather.rainMm === "number" && weather.rainMm > 0) {
    return "Regen";
  }
  const summary = weather.summary.toLowerCase();
  if (
    summary.includes("regen") ||
    summary.includes("schauer") ||
    summary.includes("niesel") ||
    summary.includes("gewitter")
  ) {
    return "Regen";
  }
  return "Trocken";
}

export function WeatherSection({
  weather,
  simple = false,
  place,
  showClothingTip = false,
  emphasis = "tertiary",
}: {
  weather: WeatherInfo | null;
  simple?: boolean;
  place?: string | null;
  /** Clothing tip is Levi-only on morning dashboards. */
  showClothingTip?: boolean;
  emphasis?: ClarityEmphasis;
}) {
  const tempClass =
    emphasis === "hero"
      ? "font-display text-5xl tracking-tight sm:text-6xl"
      : emphasis === "secondary"
        ? "font-display text-4xl tracking-tight landscape-tablet:text-5xl"
        : "font-display text-3xl tracking-tight sm:text-4xl";

  return (
    <Section title="Wetter" emphasis={emphasis}>
      {weather ? (
        <div>
          <p className={tempClass}>{weather.temperatureC}°</p>
          {simple ? (
            <p className="mt-2 text-lg text-[color:var(--ink)]">
              {rainOrDry(weather)}
              <span className="text-[color:var(--quiet)]">
                {" "}
                · {weather.summary}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-lg">{weather.summary}</p>
          )}
          {showClothingTip && weather.clothingTip ? (
            <p className="mt-3 text-[color:var(--ink)]">{weather.clothingTip}</p>
          ) : null}
          {!simple &&
          (weather.tempMinC !== undefined || weather.tempMaxC !== undefined) ? (
            <p className="mt-2 text-sm text-[color:var(--quiet)]">
              {weather.tempMinC !== undefined ? `${weather.tempMinC}°` : "—"}
              {" – "}
              {weather.tempMaxC !== undefined ? `${weather.tempMaxC}°` : "—"}
              {place ? ` · ${place}` : ""}
              {weather.rainMm && weather.rainMm > 0
                ? ` · Regen ${weather.rainMm.toFixed(1)} mm`
                : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="Wetter gerade nicht verfügbar."
          description={
            simple
              ? "Schau kurz aus dem Fenster."
              : "Wetterdaten fehlen gerade."
          }
        />
      )}
    </Section>
  );
}
