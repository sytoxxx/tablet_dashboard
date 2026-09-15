"use client";

import type { DayFlowState } from "@/lib/day/schedule-flow";
import type { ScheduleBlock } from "@/lib/day/schedule-flow";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import type { ClarityEmphasis } from "@/components/clarity-block";

export function DayFlowHero({
  flow,
  dominant = false,
  title = "Stundenplan",
}: {
  flow: DayFlowState;
  /** Levi: largest visual weight for the next lesson. */
  dominant?: boolean;
  title?: string;
}) {
  const emphasis: ClarityEmphasis = dominant ? "hero" : "secondary";

  if (flow.status === "free") {
    return (
      <Section title={title} emphasis={emphasis}>
        <EmptyState
          title="Heute nichts geplant"
          description={flow.message || "Im Stundenplan steht gerade nichts."}
        />
      </Section>
    );
  }

  if (flow.status === "done") {
    return (
      <Section
        title={title}
        emphasis={emphasis}
        aside={<RelativeChip label={flow.relativeLabel} tone="quiet" />}
      >
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
  const sectionTitle = flow.status === "current" ? "Jetzt" : title;

  return (
    <Section
      title={sectionTitle}
      emphasis={emphasis}
      aside={
        <RelativeChip
          label={flow.relativeLabel}
          tone={flow.status === "current" ? "brand" : "quiet"}
        />
      }
    >
      <p
        className={cn(
          "font-display tracking-tight animate-soft-in",
          dominant
            ? "text-5xl leading-[1.05] sm:text-6xl lg:text-7xl landscape-tablet:text-4xl landscape-tablet:leading-tight"
            : "text-4xl sm:text-5xl landscape-tablet:text-3xl",
        )}
      >
        {block.title}
      </p>
      <p
        className={cn(
          "mt-3 text-[color:var(--quiet)] landscape-tablet:mt-1.5",
          dominant
            ? "text-2xl landscape-tablet:text-lg"
            : "text-xl landscape-tablet:text-base",
        )}
      >
        <span className="tabular-nums text-[color:var(--ink)]">{block.start}</span>
        {block.end ? (
          <>
            {" – "}
            <span className="tabular-nums text-[color:var(--ink)]">{block.end}</span>
            {" Uhr"}
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
