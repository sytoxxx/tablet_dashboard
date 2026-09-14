import type { WorkShift } from "@/lib/types";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";

export function WorkShiftSection({ shift }: { shift: WorkShift | null }) {
  if (!shift) {
    return (
      <Section title="Arbeitsschicht">
        <EmptyState title="Keine Schicht" description="Heute steht keine Schicht an." />
      </Section>
    );
  }

  return (
    <Section title="Arbeitsschicht">
      <p className="font-display text-3xl tracking-tight sm:text-4xl">{shift.label}</p>
      <div className="mt-6 flex flex-wrap gap-8">
        <div>
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">Beginn</p>
          <p className="mt-1 font-display text-4xl tabular-nums">{shift.start}</p>
        </div>
        <div>
          <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">Ende</p>
          <p className="mt-1 font-display text-4xl tabular-nums">{shift.end}</p>
        </div>
      </div>
      <p className="mt-4 text-lg">{shift.location}</p>
      {shift.notes ? <p className="mt-2 text-[color:var(--quiet)]">{shift.notes}</p> : null}
    </Section>
  );
}
