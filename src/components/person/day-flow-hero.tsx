"use client";

import type { DayFlowState } from "@/lib/day/schedule-flow";
import type { ScheduleBlock } from "@/lib/day/schedule-flow";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export function DayFlowHero({
  flow,
  dominant = false,
}: {
  flow: DayFlowState;
  /** Levi: largest visual weight for “Als Nächstes”. */
  dominant?: boolean;
}) {
  if (flow.status === "free") {
    return (
      <Section title="Dein Tag">
        <EmptyState title="Heute frei" description={flow.message} />
      </Section>
    );
  }

  if (flow.status === "done") {
    return (
      <Section title="Status" aside={<RelativeChip label={flow.relativeLabel} tone="quiet" />}>
        <p
          className={cn(
            "font-display tracking-tight",
            dominant ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl",
          )}
        >
          Tag erledigt
        </p>
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
  const title = flow.status === "current" ? "Jetzt" : "Als Nächstes";

  return (
    <Section
      title={title}
      aside={<RelativeChip label={flow.relativeLabel} tone={flow.status === "current" ? "brand" : "quiet"} />}
    >
      <p
        className={cn(
          "font-display tracking-tight animate-soft-in",
          dominant
            ? "text-5xl leading-[1.05] sm:text-6xl lg:text-7xl"
            : "text-4xl sm:text-5xl",
        )}
      >
        {block.title}
      </p>
      <p
        className={cn(
          "mt-3 text-[color:var(--quiet)]",
          dominant ? "text-2xl" : "text-xl",
        )}
      >
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

function RelativeChip({
  label,
  tone,
}: {
  label: string;
  tone: "brand" | "quiet";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-sm font-medium tabular-nums",
        tone === "brand"
          ? "bg-[color:var(--brand)]/12 text-[color:var(--brand)]"
          : "bg-[color:var(--surface-strong)] text-[color:var(--quiet)]",
      )}
    >
      {label}
    </span>
  );
}
