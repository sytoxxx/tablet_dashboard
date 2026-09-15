"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useAppData } from "@/components/providers/data-provider";
import type { PersonId } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function AufgabenSettingsPage() {
  const { data, updatePerson } = useAppData();

  return (
    <AdminShell title="Aufgaben" subtitle="Eine Aufgabe pro Zeile. [x] = erledigt, * am Anfang = wichtig.">
      {data.persons.map((person) => (
        <form
          key={person.id}
          className="space-y-4 border-t border-[color:var(--hairline)] pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const tasks = String(fd.get("tasks") || "")
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, index) => {
                const done = line.startsWith("[x]") || line.startsWith("[X]");
                let label = line.replace(/^\[[ xX]\]\s*/, "");
                const important = label.startsWith("*");
                if (important) label = label.slice(1).trim();
                return {
                  id: `${person.id}-t-${index}`,
                  label: label.replace(/[<>]/g, "").slice(0, 120),
                  done,
                  important,
                };
              });
            updatePerson(person.id as PersonId, (p) => ({ ...p, tasks }));
          }}
        >
          <h2 className="font-display text-2xl tracking-tight">{person.name}</h2>
          <textarea
            name="tasks"
            rows={5}
            defaultValue={person.tasks
              .map((t) => `${t.done ? "[x] " : ""}${t.important ? "*" : ""}${t.label}`)
              .join("\n")}
            className="w-full rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-base outline-none ring-[color:var(--brand)] focus:ring-2"
          />
          <Button type="submit" size="lg" className="h-12 rounded-2xl">
            Speichern
          </Button>
        </form>
      ))}
    </AdminShell>
  );
}
