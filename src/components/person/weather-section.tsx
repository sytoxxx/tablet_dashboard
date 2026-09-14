import type { WeatherInfo } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";

export function WeatherSection({ weather }: { weather: WeatherInfo | null }) {
  return (
    <Section title="Wetter & Kleidung">
      {weather ? (
        <div>
          <p className="font-display text-4xl tracking-tight">{weather.temperatureC}°</p>
          <p className="mt-2 text-lg">{weather.summary}</p>
          <p className="mt-3 text-[color:var(--quiet)]">{weather.clothingTip}</p>
        </div>
      ) : (
        <EmptyState title="Kein Wetter" description="Wetterdaten fehlen gerade." />
      )}
    </Section>
  );
}
