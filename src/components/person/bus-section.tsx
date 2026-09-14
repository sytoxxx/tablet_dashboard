import type { BusInfo } from "@/lib/types";
import { formatMinutesUntil } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";

type BusSectionProps = {
  bus: BusInfo | null;
  stopName?: string | null;
  hasBusConfig?: boolean;
};

export function BusSection({ bus, stopName, hasBusConfig = true }: BusSectionProps) {
  return (
    <Section title="Bus">
      {bus ? (
        <div>
          <p className="font-display text-4xl tabular-nums tracking-tight landscape-tablet:text-5xl">
            {bus.departure}
          </p>
          <p className="mt-2 text-lg">
            Linie {bus.line} → {bus.destination}
          </p>
          <p className="mt-1 text-[color:var(--quiet)]">
            {stopName ?? bus.stopName}
            {" · "}
            {formatMinutesUntil(bus.minutesUntil)}
          </p>
        </div>
      ) : hasBusConfig ? (
        <EmptyState
          title="Kein Bus mehr"
          description="Für heute sind die Abfahrten vorbei."
        />
      ) : (
        <EmptyState
          title="Kein Bus nötig"
          description="Heute bleibst du in der Nähe."
        />
      )}
    </Section>
  );
}
