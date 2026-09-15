import type { MorningTimeline } from "@/lib/morning/timeline";
import { Section } from "@/components/section";
import { cn } from "@/lib/utils";
import type { ClarityEmphasis } from "@/components/clarity-block";

/**
 * Calm personal morning timeline — large type, labelled sections, tablet-first.
 * Icons never replace the status label.
 */
export function MorningTimelineSection({
  timeline,
  simple = false,
  reminderActive = false,
  reminderLabel = null,
  emphasis = "hero",
}: {
  timeline: MorningTimeline | null;
  simple?: boolean;
  /** Leave-soon acoustic/visual cue is active. */
  reminderActive?: boolean;
  reminderLabel?: string | null;
  emphasis?: ClarityEmphasis;
}) {
  if (!timeline || timeline.state === "idle") {
    if (timeline?.nextAction?.label === "Kein passender Bus") {
      return (
        <Section title="Heute" emphasis={emphasis}>
          <p className="text-lg text-[color:var(--ink)]">
            Keine passende Verbindung gerade.
          </p>
          <p className="mt-1 text-base text-[color:var(--quiet)]">
            Bitte später erneut prüfen.
          </p>
        </Section>
      );
    }
    return null;
  }

  const leaveStates =
    timeline.state === "leave_soon" ||
    timeline.state === "leave_now" ||
    timeline.state === "en_route" ||
    timeline.state === "late";

  return (
    <Section title="Heute" emphasis={emphasis}>
      <p
        className={cn(
          "font-display tracking-tight text-[color:var(--ink)]",
          simple
            ? "text-3xl sm:text-4xl"
            : "text-3xl sm:text-4xl landscape-tablet:text-[2.75rem]",
          leaveStates && "sm:text-5xl",
        )}
      >
        {timeline.stateLabel}
      </p>
      {reminderActive && timeline.state === "leave_soon" ? (
        <p className="mt-2 text-sm text-[color:var(--quiet)]">
          Erinnerung: {reminderLabel?.trim() || "Bald losfahren"}
        </p>
      ) : null}
      {timeline.nextAction?.time ? (
        <p className="mt-2 text-lg text-[color:var(--quiet)]">
          Nächster Schritt um{" "}
          <span className="tabular-nums font-medium text-[color:var(--ink)]">
            {timeline.nextAction.time}
          </span>
          {timeline.nextAction.label
            ? ` — ${timeline.nextAction.label}`
            : null}
        </p>
      ) : timeline.nextAction?.label ? (
        <p className="mt-2 text-lg text-[color:var(--quiet)]">
          {timeline.nextAction.label}
        </p>
      ) : null}

      {!simple ? (
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
      ) : timeline.timeline.length > 0 ? (
        <ol className="mt-5 space-y-2">
          {timeline.timeline.slice(0, 4).map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-baseline justify-between gap-4 text-base sm:text-lg",
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
      ) : null}
    </Section>
  );
}
