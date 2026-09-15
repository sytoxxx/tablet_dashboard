import type { WorkShift } from "@/lib/types";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import type { ClarityEmphasis } from "@/components/clarity-block";

export function WorkShiftSection({
  shift,
  simple = false,
  emphasis = "hero",
  focusTomorrow = false,
}: {
  shift: WorkShift | null;
  simple?: boolean;
  emphasis?: ClarityEmphasis;
  focusTomorrow?: boolean;
}) {
  const title = focusTomorrow ? "Morgen" : "Heute";
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
      <p className="text-lg text-[color:var(--ink)]">
        {focusTomorrow ? "Du arbeitest morgen" : "Du arbeitest heute"}
      </p>
      <p className="mt-2 font-display text-4xl tabular-nums tracking-tight sm:text-5xl landscape-tablet:text-5xl">
        {shift.start} – {shift.end} Uhr
      </p>
      {shift.label ? (
        <p className="mt-3 text-base text-[color:var(--quiet)]">{shift.label}</p>
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
