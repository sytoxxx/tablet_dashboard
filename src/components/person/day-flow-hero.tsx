import type { DayFlowState } from "@/lib/day/schedule-flow";
import type { ScheduleBlock } from "@/lib/day/schedule-flow";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";

export function DayFlowHero({ flow }: { flow: DayFlowState }) {
  if (flow.status === "free") {
    return (
      <Section title="Dein Tag">
        <EmptyState title="Frei" description={flow.message} />
      </Section>
    );
  }

  if (flow.status === "done") {
    return (
      <Section title="Als Nächstes">
        <p className="font-display text-3xl tracking-tight sm:text-4xl">{flow.message}</p>
        {flow.block ? (
          <p className="mt-2 text-[color:var(--quiet)]">
            Zuletzt: {flow.block.title}
            {flow.block.place ? ` · ${flow.block.place}` : ""}
          </p>
        ) : null}
      </Section>
    );
  }

  const block = flow.block as ScheduleBlock;
  return (
    <Section
      title="Als Nächstes"
      aside={<span className="text-sm text-[color:var(--quiet)]">{flow.message}</span>}
    >
      <p className="font-display text-4xl tracking-tight sm:text-5xl">{block.title}</p>
      <p className="mt-2 text-xl text-[color:var(--quiet)]">
        <span className="tabular-nums text-[color:var(--ink)]">{block.start}</span>
        {block.end ? (
          <>
            {" – "}
            <span className="tabular-nums text-[color:var(--ink)]">{block.end}</span>
          </>
        ) : null}
        {block.place ? ` · ${block.place}` : null}
      </p>
    </Section>
  );
}
