import type { BusInfo } from "@/lib/types";
import type { BusMorningStatus } from "@/lib/morning/types";
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
  /**
   * From morning overview: on_time / too_late / delayed / cancelled / none.
   */
  arrivalStatus?: BusMorningStatus | null;
  arrivalMessage?: string | null;
  /** Levi only: Echtzeit / Nach Fahrplan / Testdaten */
  scheduleNote?: string | null;
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
  arrivalStatus = null,
  arrivalMessage = null,
  scheduleNote = null,
}: BusSectionProps) {
  const title = simple ? "Dein Bus" : "Bus";

  if (bus?.cancelled || arrivalStatus === "cancelled") {
    return (
      <Section title={title}>
        <EmptyState
          title={simple ? "Kein passender Bus" : "Bus fällt aus"}
          description={
            simple
              ? "Bitte später erneut prüfen."
              : arrivalMessage || "Diese Verbindung fällt aus."
          }
        />
      </Section>
    );
  }

  if (bus) {
    const status: BusMorningStatus =
      arrivalStatus ??
      (bus.arrivesInTime === false
        ? "too_late"
        : bus.delayMinutes && bus.delayMinutes > 0
          ? "delayed"
          : bus.arrivesInTime === true
            ? "on_time"
            : "unknown");

    const statusCopy =
      arrivalMessage ||
      (status === "on_time"
        ? "Du kommst rechtzeitig an."
        : status === "too_late"
          ? simple
            ? "Bus reicht nicht"
            : "Möglicherweise zu spät für den Start."
          : status === "delayed" && bus.delayMinutes
            ? `ca. ${bus.delayMinutes} Min. Verspätung`
            : null);

    return (
      <Section title={title}>
        <div>
          <p className="font-display text-4xl tabular-nums tracking-tight landscape-tablet:text-5xl">
            {bus.realtimeDeparture || bus.departure}
          </p>
          <p className="mt-2 text-lg text-[color:var(--ink)]">
            {formatMinutesUntil(bus.minutesUntil)}
          </p>
          {statusCopy &&
          (status === "on_time" ||
            status === "too_late" ||
            status === "delayed") ? (
            <p
              className={
                simple || status === "on_time" || status === "delayed"
                  ? "mt-2 text-base text-[color:var(--ink)]"
                  : "mt-2 text-sm text-[color:var(--quiet)]"
              }
            >
              {statusCopy}
            </p>
          ) : null}
          {!simple &&
          bus.scheduledDeparture &&
          bus.realtimeDeparture &&
          bus.scheduledDeparture !== bus.realtimeDeparture ? (
            <p className="mt-1 text-sm text-[color:var(--quiet)]">
              Fahrplan {bus.scheduledDeparture}
            </p>
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
          {!simple && (scheduleNote || isTestData) ? (
            <p className="mt-2 text-xs text-[color:var(--quiet)]">
              {scheduleNote || "Testdaten — keine Live-Abfahrt"}
            </p>
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
