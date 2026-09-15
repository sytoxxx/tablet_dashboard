import type { CalendarEvent } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";
import { cn } from "@/lib/utils";

export function CalendarSection({
  events,
  compact = false,
}: {
  events: CalendarEvent[];
  compact?: boolean;
}) {
  return (
    <Section title="Termine">
      {events.length === 0 ? (
        <EmptyState title="Keine Termine" description="Heute ist der Kalender leer." />
      ) : (
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
      )}
    </Section>
  );
}
