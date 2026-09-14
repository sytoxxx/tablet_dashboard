import type { BusInfo } from "@/lib/types";
import { formatMinutesUntil } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";
import { friendlyBusEmptyMessage } from "@/lib/bus/select";

type BusSectionProps = {
  bus: BusInfo | null;
  stopName?: string | null;
  hasBusConfig?: boolean;
  busEnabled?: boolean;
  message?: string | null;
  emptyTitle?: string | null;
  upcoming?: Array<{ time: string; line?: string }>;
  simple?: boolean;
  matchedToWork?: boolean;
  fetchedAt?: string | null;
  offline?: boolean;
  unavailable?: boolean;
  /** Admin/Levi only — never on Birgit simple view as jargon. */
  isTestData?: boolean;
  /** Friendly age label e.g. "vor 4 Min." */
  dataAgeLabel?: string | null;
};

export function BusSection({
  bus,
  stopName,
  hasBusConfig = true,
  busEnabled = true,
  message,
  emptyTitle,
  upcoming,
  simple = false,
  matchedToWork,
  fetchedAt,
  offline,
  unavailable,
  isTestData,
  dataAgeLabel,
}: BusSectionProps) {
  const title = simple ? "Dein Bus" : "Bus";

  if (bus) {
    const showOnTime =
      simple &&
      (bus.arrivesInTime === true || (matchedToWork && bus.arrivesInTime !== false));

    return (
      <Section title={title}>
        <div>
          <p className="font-display text-4xl tabular-nums tracking-tight landscape-tablet:text-5xl">
            {bus.departure}
          </p>
          <p className="mt-2 text-lg text-[color:var(--ink)]">
            {formatMinutesUntil(bus.minutesUntil)}
          </p>
          {showOnTime ? (
            <p className="mt-2 text-base text-[color:var(--ink)]">Du kommst rechtzeitig an.</p>
          ) : null}
          {!simple && bus.arrivesInTime === false ? (
            <p className="mt-2 text-sm text-[color:var(--quiet)]">
              Möglicherweise zu spät für den Start.
            </p>
          ) : null}
          {!simple && bus.arrivesInTime === true && matchedToWork ? (
            <p className="mt-2 text-sm text-[color:var(--quiet)]">Passend zur Ankunftszeit.</p>
          ) : null}
          {!simple ? (
            <p className="mt-1 text-[color:var(--quiet)]">
              Linie {bus.line} → {bus.destination}
            </p>
          ) : null}
          {!simple ? (
            <p className="mt-1 text-[color:var(--quiet)]">
              {stopName ?? bus.stopName}
              {matchedToWork ? " · passend zur Arbeit/Schule" : null}
            </p>
          ) : null}
          {upcoming && upcoming.length > 1 && !simple ? (
            <p className="mt-2 text-sm text-[color:var(--quiet)]">
              Danach:{" "}
              {upcoming
                .slice(1, 3)
                .map((u) => u.time)
                .join(" · ")}
            </p>
          ) : null}
          {!simple && isTestData ? (
            <p className="mt-2 text-xs text-[color:var(--quiet)]">Testdaten — keine Live-Abfahrt</p>
          ) : null}
          {(offline || bus.source === "cache") && dataAgeLabel ? (
            <p className="mt-2 text-xs text-[color:var(--quiet)]">
              Daten zuletzt aktualisiert {dataAgeLabel}
            </p>
          ) : null}
          {fetchedAt && bus.source === "cache" && !dataAgeLabel ? (
            <p className="mt-2 text-xs text-[color:var(--quiet)]">Zuletzt gespeichert</p>
          ) : null}
        </div>
      </Section>
    );
  }

  const fallback = friendlyBusEmptyMessage({
    simple,
    hasConfig: hasBusConfig,
    enabled: busEnabled,
    offline,
    unavailable,
  });

  return (
    <Section title={simple ? "Dein Bus" : "Bus"}>
      <EmptyState
        title={emptyTitle || fallback.title}
        description={
          simple
            ? offline && dataAgeLabel
              ? `Daten zuletzt aktualisiert ${dataAgeLabel}`
              : fallback.description
            : message || fallback.description
        }
      />
    </Section>
  );
}
