import type { WeatherInfo } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";

export function WeatherSection({ weather }: { weather: WeatherInfo | null }) {
  return (
    <Section title="Wetter">
      {weather ? (
        <div>
          <p className="font-display text-4xl tracking-tight landscape-tablet:text-5xl">
            {weather.temperatureC}°
          </p>
          <p className="mt-2 text-lg">{weather.summary}</p>
          <p className="mt-3 text-[color:var(--quiet)]">{weather.clothingTip}</p>
        </div>
      ) : (
        <EmptyState
          title="Wetter fehlt"
          description="Schau kurz aus dem Fenster — gleich geht’s weiter."
        />
      )}
    </Section>
  );
}
