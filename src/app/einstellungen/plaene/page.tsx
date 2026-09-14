"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PlanWeekEditor } from "@/components/plan/plan-week-editor";
import { useAppData } from "@/components/providers/data-provider";
import type { PersonId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function PlaeneSettingsPage() {
  const { data, updatePerson } = useAppData();
  const [personId, setPersonId] = useState<PersonId>("levi");
  const person = data.persons.find((p) => p.id === personId) ?? data.persons[0];
  const [saved, setSaved] = useState(false);

  if (!person) {
    return (
      <AdminShell title="Pläne">
        <p>Keine Personen geladen.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Pläne"
      subtitle="Touch-freundliche Wochenansicht Mo–So. Schul- und Arbeitsfelder je Plan-Typ."
    >
      <div className="flex flex-wrap gap-2">
        {data.persons.map((p) => (
          <button
            key={p.id}
            type="button"
            className={cn(
              "min-h-12 rounded-2xl px-4",
              personId === p.id
                ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                : "bg-[color:var(--surface)]",
            )}
            onClick={() => {
              setPersonId(p.id);
              setSaved(false);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <p className="text-sm text-[color:var(--quiet)]">
        Aktuell: {person.name} · {person.schedule.type}
      </p>

      <PlanWeekEditor
        person={person}
        onChange={(schedule) => {
          updatePerson(person.id, (p) => ({ ...p, schedule }));
          setSaved(true);
        }}
      />

      {saved ? (
        <p role="status" className="text-sm text-[color:var(--quiet)]">
          Änderungen gespeichert.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" className="h-12 rounded-2xl">
          <Link href="/einstellungen/ki">KI-Import</Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          size="lg"
          className="h-12 rounded-2xl bg-[color:var(--surface)]"
        >
          <Link href={`/person/${person.id}`}>Dashboard prüfen</Link>
        </Button>
      </div>
    </AdminShell>
  );
}
