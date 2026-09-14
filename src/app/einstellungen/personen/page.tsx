"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useAppData } from "@/components/providers/data-provider";
import { Button } from "@/components/ui/button";
import type { DisplayPrefs, Schedule } from "@/lib/types";
import { cn } from "@/lib/utils";

const PREF_LABELS: { key: keyof DisplayPrefs; label: string }[] = [
  { key: "showBus", label: "Bus anzeigen" },
  { key: "showWeather", label: "Wetter anzeigen" },
  { key: "showCalendar", label: "Kalender anzeigen" },
  { key: "showTasks", label: "Aufgaben anzeigen" },
];

export default function PersonenSettingsPage() {
  const { data, updatePerson } = useAppData();

  return (
    <AdminShell
      title="Personen"
      subtitle="Nur Levi, Birgit und Heidi. Home nutzt die gespeicherten Namen."
    >
      <div className="space-y-10">
        {data.persons.map((person) => (
          <form
            key={person.id}
            className="space-y-4 border-t border-[color:var(--hairline)] pt-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const planType = String(fd.get("planType") || person.schedule.type) as Schedule["type"];
              const displayPrefs: DisplayPrefs = {
                showBus: fd.get("showBus") === "on",
                showWeather: fd.get("showWeather") === "on",
                showCalendar: fd.get("showCalendar") === "on",
                showTasks: fd.get("showTasks") === "on",
              };
              updatePerson(person.id, (p) => {
                const schedule: Schedule =
                  p.schedule.type === planType
                    ? p.schedule
                    : { type: planType, week: {} };
                return {
                  ...p,
                  name: String(fd.get("name") || p.name).replace(/[<>]/g, "").slice(0, 40),
                  avatar: String(fd.get("avatar") || p.avatar).replace(/[<>]/g, "").slice(0, 2),
                  greeting: String(fd.get("greeting") || p.greeting).replace(/[<>]/g, "").slice(0, 80),
                  hint: String(fd.get("hint") || p.hint).replace(/[<>]/g, "").slice(0, 60),
                  schedule,
                  displayPrefs,
                };
              });
            }}
          >
            <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">
              {person.id}
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

            <fieldset className="space-y-2">
              <legend className="text-sm text-[color:var(--quiet)]">Plan-Typ</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "school", label: "Stundenplan" },
                    { id: "work", label: "Arbeitsplan" },
                    { id: "personal", label: "Persönlich" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.id}
                    className={cn(
                      "inline-flex min-h-12 cursor-pointer items-center rounded-2xl px-4",
                      "has-[:checked]:bg-[color:var(--ink)] has-[:checked]:text-[color:var(--surface)]",
                      "bg-[color:var(--surface)]",
                    )}
                  >
                    <input
                      type="radio"
                      name="planType"
                      value={opt.id}
                      defaultChecked={person.schedule.type === opt.id}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-[color:var(--quiet)]">
                Wechsel leert den Wochenplan — vorher exportieren.
              </p>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm text-[color:var(--quiet)]">Anzeige auf dem Dashboard</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {PREF_LABELS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex min-h-12 items-center gap-3 rounded-2xl bg-[color:var(--surface)] px-4"
                  >
                    <input
                      type="checkbox"
                      name={key}
                      defaultChecked={person.displayPrefs?.[key] ?? true}
                      className="size-5"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <Button type="submit" size="lg" className="h-12 rounded-2xl">
              Speichern
            </Button>
          </form>
        ))}
      </div>
    </AdminShell>
  );
}
