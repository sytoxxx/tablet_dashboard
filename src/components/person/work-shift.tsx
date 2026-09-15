import type { WorkShift } from "@/lib/types";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";

export function WorkShiftSection({
  shift,
  simple = false,
}: {
  shift: WorkShift | null;
  simple?: boolean;
}) {
  const title = simple ? "Arbeit" : "Arbeitsschicht";

  if (!shift) {
    return (
      <Section title={title}>
        <EmptyState
          title="Heute frei"
          description="Heute steht keine Schicht an — ruhiger Tag."
        />
      </Section>
    );
  }

  return (
    <Section title={title}>
      <p className="font-display text-3xl tracking-tight sm:text-4xl landscape-tablet:text-4xl">
        {shift.label}
      </p>
      <div className="mt-5 flex flex-wrap gap-8">
        <div>
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">Beginn</p>
          <p className="mt-1 font-display text-4xl tabular-nums landscape-tablet:text-5xl">
            {shift.start}
          </p>
        </div>
        <div>
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">Ende</p>
          <p className="mt-1 font-display text-4xl tabular-nums landscape-tablet:text-5xl">
            {shift.end}
          </p>
        </div>
      </div>
      <p className="mt-4 text-lg">{shift.location}</p>
      {shift.notes ? <p className="mt-2 text-[color:var(--quiet)]">{shift.notes}</p> : null}
    </Section>
  );
}
