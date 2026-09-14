import type { BusInfo } from "@/lib/types";
import { formatMinutesUntil } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";

export function BusSection({ bus }: { bus: BusInfo | null }) {
  return (
    <Section title="Nächster Bus">
      {bus ? (
        <div>
          <p className="font-display text-4xl tabular-nums tracking-tight">{bus.departure}</p>
          <p className="mt-2 text-lg">
            Linie {bus.line} → {bus.destination}
          </p>
          <p className="mt-1 text-[color:var(--quiet)]">{formatMinutesUntil(bus.minutesUntil)}</p>
        </div>
      ) : (
        <EmptyState
          title="Kein Bus nötig"
          description="Heute bist du zu Fuß oder bleibst in der Nähe."
        />
      )}
    </Section>
  );
}
