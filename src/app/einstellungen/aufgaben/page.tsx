"use client";

import { AppNav } from "@/components/shared/app-nav";
import { useAppData } from "@/components/providers/data-provider";
import type { PersonId } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function AufgabenSettingsPage() {
  const { data, updatePerson } = useAppData();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6 sm:px-8">
      <AppNav showSettings={false} backLabel="Einstellungen" backHref="/einstellungen" />
      <header>
        <h1 className="font-display text-4xl tracking-tight">Aufgaben</h1>
        <p className="mt-2 text-[color:var(--quiet)]">Eine Aufgabe pro Zeile. Haken = erledigt mit [x].</p>
      </header>

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
                const label = line.replace(/^\[[ xX]\]\s*/, "");
                return { id: `${person.id}-t-${index}`, label, done };
              });
            updatePerson(person.id as PersonId, (p) => ({ ...p, tasks }));
          }}
        >
          <h2 className="font-display text-2xl tracking-tight">{person.name}</h2>
          <textarea
            name="tasks"
            rows={5}
            defaultValue={person.tasks
              .map((t) => `${t.done ? "[x] " : ""}${t.label}`)
              .join("\n")}
            className="w-full rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-base outline-none ring-[color:var(--brand)] focus:ring-2"
          />
          <Button type="submit" size="lg" className="h-12 rounded-2xl">
            Speichern
          </Button>
        </form>
      ))}
    </main>
  );
}
