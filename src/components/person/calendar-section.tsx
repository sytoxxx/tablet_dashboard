import type { CalendarEvent } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";

export function CalendarSection({ events }: { events: CalendarEvent[] }) {
  return (
    <Section title="Kalender">
      {events.length === 0 ? (
        <EmptyState title="Frei" description="Keine weiteren Termine heute." />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={`${event.time}-${event.title}`} className="flex gap-4 text-base sm:text-lg">
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
