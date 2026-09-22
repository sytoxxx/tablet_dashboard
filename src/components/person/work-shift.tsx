import type { WorkShift } from "@/lib/types";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import type { ClarityEmphasis } from "@/components/clarity-block";

export function WorkShiftSection({
  shift,
  simple = false,
  emphasis = "hero",
  focusTomorrow = false,
  /** When the day's time isn't confirmed, say so honestly — never show a guessed or stale shift. */
  confirmation = "confirmed",
}: {
  shift: WorkShift | null;
  simple?: boolean;
  emphasis?: ClarityEmphasis;
  focusTomorrow?: boolean;
  confirmation?: "confirmed" | "typical" | "unavailable";
}) {
  const title = focusTomorrow ? "Morgen" : "Heute";

  if (confirmation === "typical" || confirmation === "unavailable") {
    return (
      <Section title={title} emphasis={emphasis}>
        <EmptyState
          title={
            confirmation === "typical"
              ? "Arbeitszeit: Informationen nicht verfügbar"
              : "Arbeitszeit noch nicht bekannt"
          }
          description={
            confirmation === "typical"
              ? "Monatsplan noch nicht verfügbar — der Bus unten orientiert sich an der üblichen Arbeitszeit."
              : "Noch kein Monatsplan und keine übliche Arbeitszeit hinterlegt."
          }
        />
      </Section>
    );
  }

  if (!shift) {
    return (
      <Section title={title} emphasis={emphasis}>
        <EmptyState
          title={
            focusTomorrow
              ? "Morgen sind keine Arbeitszeiten eingetragen."
              : "Heute sind keine Arbeitszeiten eingetragen."
          }
          description={
            simple
              ? "Sobald Schichtzeiten da sind, siehst du sie hier."
              : focusTomorrow
                ? "Morgen steht keine Schicht an."
                : "Heute steht keine Schicht an — ruhiger Tag."
          }
        />
      </Section>
    );
  }

  return (
    <Section title={title} emphasis={emphasis}>
      <p className="text-lg text-[color:var(--ink)] landscape-tablet:text-base">
        {focusTomorrow ? "Du arbeitest morgen" : "Du arbeitest heute"}
      </p>
      <p className="mt-2 font-display text-4xl tabular-nums tracking-tight sm:text-5xl landscape-tablet:mt-1 landscape-tablet:text-4xl">
        {shift.start} – {shift.end} Uhr
      </p>
      {shift.label ? (
        <p className="mt-3 text-base text-[color:var(--quiet)] landscape-tablet:mt-2 landscape-tablet:text-sm">
          {shift.label}
        </p>
      ) : null}
      {!simple && shift.location ? (
        <p className="mt-1 text-lg">{shift.location}</p>
      ) : null}
      {!simple && shift.notes ? (
        <p className="mt-2 text-[color:var(--quiet)]">{shift.notes}</p>
      ) : null}
    </Section>
  );
}
