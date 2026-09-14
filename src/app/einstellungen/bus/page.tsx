"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useAppData } from "@/components/providers/data-provider";
import type { PersonId } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function BusSettingsPage() {
  const { data, updatePerson } = useAppData();

  return (
    <AdminShell
      title="Bus"
      subtitle="Haltestelle und Abfahrten. Der nächste Bus wird aus der aktuellen Uhrzeit gewählt."
    >
      {data.persons.map((person) => (
        <section key={person.id} className="space-y-4 border-t border-[color:var(--hairline)] pt-6">
          <h2 className="font-display text-2xl tracking-tight">{person.name}</h2>
          {!person.busStop ? (
            <div className="space-y-3">
              <p className="text-[color:var(--quiet)]">Keine Haltestelle konfiguriert.</p>
              <Button
                type="button"
                size="lg"
                className="h-12 rounded-2xl"
                onClick={() =>
                  updatePerson(person.id as PersonId, (p) => ({
                    ...p,
                    busStop: { name: "Haltestelle", departures: [] },
                  }))
                }
              >
                Haltestelle anlegen
              </Button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const stopName = String(fd.get("stopName") || person.busStop?.name || "")
                  .replace(/[<>]/g, "")
                  .slice(0, 60);
                const lines = String(fd.get("departures") || "")
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, index) => {
                    const [time, busLine, ...destParts] = line.split(/\s+/);
                    return {
                      id: `${person.id}-dep-${index}`,
                      time: time ?? "00:00",
                      line: (busLine ?? "?").replace(/[<>]/g, "").slice(0, 12),
                      destination: destParts.join(" ").replace(/[<>]/g, "").slice(0, 60) || "—",
                    };
                  });
                updatePerson(person.id as PersonId, (p) => ({
                  ...p,
                  busStop: { name: stopName, departures: lines },
                }));
              }}
            >
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">Haltestelle</span>
                <input
                  name="stopName"
                  defaultValue={person.busStop.name}
                  className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">
                  Abfahrten (eine pro Zeile: HH:MM Linie Ziel)
                </span>
                <textarea
                  name="departures"
                  rows={6}
                  defaultValue={person.busStop.departures
                    .map((d) => `${d.time} ${d.line} ${d.destination}`)
                    .join("\n")}
                  className="w-full rounded-2xl bg-[color:var(--surface)] px-4 py-3 font-mono text-sm outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="lg" className="h-12 rounded-2xl">
                  Speichern
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="h-12 rounded-2xl"
                  onClick={() =>
                    updatePerson(person.id as PersonId, (p) => ({ ...p, busStop: null }))
                  }
                >
                  Entfernen
                </Button>
              </div>
            </form>
          )}
        </section>
      ))}
    </AdminShell>
  );
}
