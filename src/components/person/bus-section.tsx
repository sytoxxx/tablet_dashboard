import type { BusInfo } from "@/lib/types";
import { formatMinutesUntil } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";

type BusSectionProps = {
  bus: BusInfo | null;
  stopName?: string | null;
  hasBusConfig?: boolean;
  /** Friendly empty / error copy (Birgit). */
  message?: string | null;
  /** Extra upcoming times HH:MM */
  upcoming?: Array<{ time: string; line?: string }>;
  /** Hide technical wording entirely. */
  simple?: boolean;
  matchedToWork?: boolean;
  fetchedAt?: string | null;
};

export function BusSection({
  bus,
  stopName,
  hasBusConfig = true,
  message,
  upcoming,
  simple = false,
  matchedToWork,
  fetchedAt,
}: BusSectionProps) {
  const title = simple ? "Dein Bus" : "Bus";

  if (bus) {
    return (
      <Section title={title}>
        <div>
          <p className="font-display text-4xl tabular-nums tracking-tight landscape-tablet:text-5xl">
            {bus.departure}
          </p>
          <p className="mt-2 text-lg text-[color:var(--ink)]">
            {formatMinutesUntil(bus.minutesUntil)}
          </p>
          {!simple ? (
            <p className="mt-1 text-[color:var(--quiet)]">
              Linie {bus.line} → {bus.destination}
            </p>
          ) : null}
          <p className="mt-1 text-[color:var(--quiet)]">
            {stopName ?? bus.stopName}
            {matchedToWork && !simple ? " · passend zur Arbeit" : null}
          </p>
          {upcoming && upcoming.length > 1 && !simple ? (
            <p className="mt-2 text-sm text-[color:var(--quiet)]">
              Danach:{" "}
              {upcoming
                .slice(1, 3)
                .map((u) => u.time)
                .join(" · ")}
            </p>
          ) : null}
          {fetchedAt && bus.source === "cache" ? (
            <p className="mt-2 text-xs text-[color:var(--quiet)]">Zuletzt gespeichert</p>
          ) : null}
        </div>
      </Section>
    );
  }

  if (!hasBusConfig) {
    return (
      <Section title={title}>
        <EmptyState
          title={simple ? "Kein Bus nötig" : "Kein Bus nötig"}
          description={
            simple
              ? "Heute bleibst du in der Nähe."
              : "Keine Haltestelle eingerichtet."
          }
        />
      </Section>
    );
  }

  return (
    <Section title={title}>
      <EmptyState
        title={
          message?.includes("verfügbar")
            ? "Busdaten gerade nicht verfügbar."
            : "Heute keine weitere Verbindung"
        }
        description={
          simple
            ? message && !message.includes("API")
              ? message
              : "Schau später noch einmal vorbei."
            : message || "Alle Abfahrten für heute sind vorbei."
        }
      />
    </Section>
  );
}
