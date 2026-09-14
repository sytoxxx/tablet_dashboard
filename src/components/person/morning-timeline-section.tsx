import type { MorningTimeline } from "@/lib/morning/timeline";
import { Section } from "@/components/section";
import { cn } from "@/lib/utils";

/**
 * Calm personal morning timeline — large type, few lines, tablet-first.
 */
export function MorningTimelineSection({
  timeline,
  simple = false,
}: {
  timeline: MorningTimeline | null;
  simple?: boolean;
}) {
  if (!timeline || timeline.state === "idle") {
    if (timeline?.nextAction?.label === "Kein passender Bus") {
      return (
        <Section title="Heute">
          <p className="text-lg text-[color:var(--ink)]">Kein passender Bus</p>
          <p className="mt-1 text-base text-[color:var(--quiet)]">
            Bitte prüfe die nächste Verbindung.
          </p>
        </Section>
      );
    }
    return null;
  }

  return (
    <Section title="Heute">
      <p
        className={cn(
          "font-display tracking-tight text-[color:var(--ink)]",
          simple ? "text-3xl sm:text-4xl" : "text-3xl sm:text-4xl landscape-tablet:text-[2.75rem]",
        )}
      >
        {timeline.stateLabel}
      </p>
      {timeline.nextAction?.time ? (
        <p className="mt-1 text-base text-[color:var(--quiet)] tabular-nums">
          {timeline.nextAction.time}
        </p>
      ) : null}

      <ol className="mt-5 space-y-3">
        {timeline.timeline.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-baseline justify-between gap-4 text-lg sm:text-xl",
              item.done && "text-[color:var(--quiet)]",
              item.active && "font-medium text-[color:var(--ink)]",
            )}
          >
            <span className="min-w-0 truncate">{item.label}</span>
            {item.time ? (
              <span className="shrink-0 tabular-nums text-[color:var(--quiet)]">
                {item.time}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}
