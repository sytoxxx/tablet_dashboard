import type { WorkShift } from "@/lib/types";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import type { ClarityEmphasis } from "@/components/clarity-block";

export function WorkShiftSection({
  shift,
  simple = false,
  emphasis = "hero",
}: {
  shift: WorkShift | null;
  simple?: boolean;
  emphasis?: ClarityEmphasis;
}) {
  if (!shift) {
    return (
      <Section title="Heute" emphasis={emphasis}>
        <EmptyState
          title="Heute sind keine Arbeitszeiten eingetragen."
          description={
            simple
              ? "Sobald Schichtzeiten da sind, siehst du sie hier."
              : "Heute steht keine Schicht an — ruhiger Tag."
          }
        />
      </Section>
    );
  }

  return (
    <Section title="Heute" emphasis={emphasis}>
      <p className="text-lg text-[color:var(--ink)]">Du arbeitest heute</p>
      <p className="mt-2 font-display text-4xl tabular-nums tracking-tight sm:text-5xl landscape-tablet:text-5xl">
        {shift.start} – {shift.end} Uhr
      </p>
      {shift.label ? (
        <p className="mt-3 text-base text-[color:var(--quiet)]">{shift.label}</p>
      ) : null}
      {shift.location ? (
        <p className="mt-1 text-lg">{shift.location}</p>
      ) : null}
      {!simple && shift.notes ? (
        <p className="mt-2 text-[color:var(--quiet)]">{shift.notes}</p>
      ) : null}
    </Section>
  );
}
