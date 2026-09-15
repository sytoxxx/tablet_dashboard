"use client";

import type { TimetableEntry } from "@/lib/types";
import { getCurrentOrNextLesson } from "@/lib/today";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import { useNow } from "@/hooks/use-now";

export function NextLessonHighlight({ entries }: { entries: TimetableEntry[] }) {
  const now = useNow(30_000);
  const snapshot = getCurrentOrNextLesson(entries, now);

  if (!snapshot) {
    return (
      <Section title="Nächstes Fach">
        <EmptyState title="Kein Plan" description="Heute steht kein Stundenplan." />
      </Section>
    );
  }

  if (snapshot.status === "done") {
    return (
      <Section title="Nächstes Fach">
        <p className="font-display text-3xl tracking-tight sm:text-4xl">Schultag vorbei</p>
        <p className="mt-2 text-[color:var(--quiet)]">
          Letztes Fach war {snapshot.lesson.subject} in {snapshot.lesson.room}.
        </p>
      </Section>
    );
  }

  const label = snapshot.status === "now" ? "Jetzt" : "Als Nächstes";

  return (
    <Section
      title="Nächstes Fach"
      aside={<span className="text-sm text-[color:var(--quiet)]">{label}</span>}
    >
      <p className="font-display text-4xl tracking-tight sm:text-5xl">{snapshot.lesson.subject}</p>
      <p className="mt-2 text-xl text-[color:var(--quiet)]">
        <span className="tabular-nums text-[color:var(--ink)]">{snapshot.lesson.time}</span>
        {" · "}
        Raum {snapshot.lesson.room}
      </p>
    </Section>
  );
}
