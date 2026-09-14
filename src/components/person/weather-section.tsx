import type { WeatherInfo } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";

export function WeatherSection({
  weather,
  simple = false,
  place,
}: {
  weather: WeatherInfo | null;
  simple?: boolean;
  place?: string | null;
}) {
  return (
    <Section title={simple ? "Wetter" : "Wetter"}>
      {weather ? (
        <div>
          <p className="font-display text-4xl tracking-tight landscape-tablet:text-5xl">
            {weather.temperatureC}°
          </p>
          <p className="mt-2 text-lg">{weather.summary}</p>
          <p className="mt-3 text-[color:var(--ink)]">{weather.clothingTip}</p>
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
