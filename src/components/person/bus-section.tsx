import type { BusInfo } from "@/lib/types";
import type { BusMorningStatus } from "@/lib/morning/types";
import { formatMinutesUntil } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";
import { friendlyBusEmptyMessage } from "@/lib/bus/select";
import type { ClarityEmphasis } from "@/components/clarity-block";

type BusSectionProps = {
  bus: BusInfo | null;
  stopName?: string | null;
  hasBusConfig?: boolean;
  busEnabled?: boolean;
  message?: string | null;
  emptyTitle?: string | null;
  upcoming?: Array<{ time: string; line?: string; destination?: string }>;
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
  emphasis?: ClarityEmphasis;
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
  emphasis = "secondary",
}: BusSectionProps) {
  const title = "Nächster Bus";

  if (bus?.cancelled || arrivalStatus === "cancelled") {
    return (
      <Section title={title} emphasis={emphasis}>
        <EmptyState
          title="Du musst heute keinen Bus nehmen."
          description={
            simple
              ? "Diese Verbindung fällt aus — bitte später erneut prüfen."
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
            ? "Bus reicht nicht rechtzeitig."
            : "Möglicherweise zu spät für den Start."
          : status === "delayed" && bus.delayMinutes
            ? `ca. ${bus.delayMinutes} Min. Verspätung`
            : null);

    return (
      <Section title={title} emphasis={emphasis}>
        <div>
          <p className="font-display text-4xl tabular-nums tracking-tight landscape-tablet:text-5xl">
            {bus.realtimeDeparture || bus.departure}
          </p>
          <p className="mt-2 text-lg text-[color:var(--ink)]">
            Bus {bus.line} → {bus.destination}
          </p>
          <p className="mt-1 text-base text-[color:var(--quiet)]">
            {formatMinutesUntil(bus.minutesUntil)}
          </p>
          {statusCopy &&
          (status === "on_time" ||
            status === "too_late" ||
            status === "delayed") ? (
            <p className="mt-2 text-base text-[color:var(--ink)]">{statusCopy}</p>
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
              {stopName ?? bus.stopName}
              {matchedToWork ? " · passend zur Schule" : null}
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
            <p className="mt-2 text-xs text-[color:var(--quiet)]">
              Zuletzt gespeichert
            </p>
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
    <Section title={title} emphasis={emphasis}>
      <EmptyState
        title={
          emptyTitle ||
          (simple
            ? "Du musst heute keinen Bus nehmen."
            : fallback.title)
        }
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
