"use client";

import { AppNav } from "@/components/shared/app-nav";
import { useAppData } from "@/components/providers/data-provider";
import { Button } from "@/components/ui/button";

export default function PersonenSettingsPage() {
  const { data, updatePerson } = useAppData();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6 sm:px-8">
      <AppNav showSettings={false} backLabel="Einstellungen" backHref="/einstellungen" />
      <header>
        <h1 className="font-display text-4xl tracking-tight">Personen</h1>
        <p className="mt-2 text-[color:var(--quiet)]">Namen, Avatar-Initial und Begrüßung.</p>
      </header>

      <div className="space-y-10">
        {data.persons.map((person) => (
          <form
            key={person.id}
            className="space-y-4 border-t border-[color:var(--hairline)] pt-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updatePerson(person.id, (p) => ({
                ...p,
                name: String(fd.get("name") || p.name),
                avatar: String(fd.get("avatar") || p.avatar).slice(0, 2),
                greeting: String(fd.get("greeting") || p.greeting),
                hint: String(fd.get("hint") || p.hint),
              }));
            }}
          >
            <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">
              {person.id} · {person.schedule.type}
            </p>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">Name</span>
              <input
                name="name"
                defaultValue={person.name}
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">Avatar</span>
              <input
                name="avatar"
                defaultValue={person.avatar}
                maxLength={2}
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">Begrüßung</span>
              <input
                name="greeting"
                defaultValue={person.greeting}
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">Hinweis</span>
              <input
                name="hint"
                defaultValue={person.hint}
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <Button type="submit" size="lg" className="h-12 rounded-2xl">
              Speichern
            </Button>
          </form>
        ))}
      </div>
    </main>
  );
}
