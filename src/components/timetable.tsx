import type { TimetableEntry } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

type TimetableProps = {
  entries: TimetableEntry[];
};

export function Timetable({ entries }: TimetableProps) {
  if (entries.length === 0) {
    return <EmptyState title="Kein Stundenplan" description="Heute stehen keine Einträge an." />;
  }

  return (
    <ul className="space-y-4" aria-label="Stundenplan">
      {entries.map((entry) => (
        <li
          key={`${entry.time}-${entry.subject}`}
          className="grid grid-cols-[5.5rem_1fr_auto] items-baseline gap-3 border-b border-[color:var(--hairline)] pb-4 last:border-0 last:pb-0"
        >
          <time className="font-display text-2xl tabular-nums text-[color:var(--ink)]">
            {entry.time}
          </time>
          <span className="text-lg font-medium sm:text-xl">{entry.subject}</span>
          <span className="text-sm text-[color:var(--quiet)] sm:text-base">{entry.room}</span>
        </li>
      ))}
    </ul>
  );
}
