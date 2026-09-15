import type { CalendarEvent } from "@/lib/types";
import { Section } from "@/components/section";
import { cn } from "@/lib/utils";

export function CalendarSection({
  events,
  compact = false,
}: {
  events: CalendarEvent[];
  compact?: boolean;
}) {
  if (events.length === 0) return null;

  return (
    <Section title="Termine" emphasis="tertiary">
      <ul className={cn("space-y-3", compact && "space-y-2")}>
        {events.slice(0, compact ? 3 : 8).map((event) => (
          <li
            key={`${event.time}-${event.title}`}
            className={cn(
              "flex gap-4",
              compact ? "text-base" : "text-base sm:text-lg",
            )}
          >
            <time className="w-14 shrink-0 tabular-nums text-[color:var(--quiet)]">
              {event.time}
            </time>
            <span>{event.title}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
