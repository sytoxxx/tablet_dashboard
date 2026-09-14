"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useAppData } from "@/components/providers/data-provider";
import type { PersonId } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";

export default function BusSettingsPage() {
  const { data, updatePerson } = useAppData();

  return (
    <AdminShell
      title="Bus"
      subtitle="Haltestelle, optional Wiener-Linien-ID (RBL), Vorlaufzeit zur Arbeit. Morning-UI bleibt einfach."
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
                    busStop: {
                      name: "Haltestelle",
                      departures: [],
                      provider: "local",
                    },
                    transitPrefs: p.transitPrefs ?? DEFAULT_TRANSIT_PREFS,
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
                const externalId = String(fd.get("externalId") || "")
                  .replace(/\D/g, "")
                  .slice(0, 12);
                const leadTimeMinutes = Math.min(
                  180,
                  Math.max(5, Number(fd.get("leadTimeMinutes") || DEFAULT_TRANSIT_PREFS.leadTimeMinutes)),
                );
                const provider =
                  fd.get("provider") === "wienerlinien" ? "wienerlinien" : "local";
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
                      destination:
                        destParts.join(" ").replace(/[<>]/g, "").slice(0, 60) || "—",
                    };
                  });
                updatePerson(person.id as PersonId, (p) => ({
                  ...p,
                  busStop: {
                    name: stopName,
                    departures: lines,
                    externalId: externalId || undefined,
                    provider,
                  },
                  transitPrefs: { leadTimeMinutes },
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
                  Wiener Linien RBL (optional, nur Wien — Live-Abfahrten)
                </span>
                <input
                  name="externalId"
                  defaultValue={person.busStop.externalId ?? ""}
                  placeholder="z. B. 147"
                  inputMode="numeric"
                  className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm text-[color:var(--quiet)]">Quelle</legend>
                <div className="flex flex-wrap gap-3">
                  <label className="flex min-h-11 items-center gap-2 rounded-2xl bg-[color:var(--surface)] px-4">
                    <input
                      type="radio"
                      name="provider"
                      value="local"
                      defaultChecked={person.busStop.provider !== "wienerlinien"}
                    />
                    Lokaler Plan
                  </label>
                  <label className="flex min-h-11 items-center gap-2 rounded-2xl bg-[color:var(--surface)] px-4">
                    <input
                      type="radio"
                      name="provider"
                      value="wienerlinien"
                      defaultChecked={person.busStop.provider === "wienerlinien"}
                    />
                    Wiener Linien Live
                  </label>
                </div>
              </fieldset>
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">
                  Vorlaufzeit vor Arbeit/Schule (Minuten)
                </span>
                <input
                  name="leadTimeMinutes"
                  type="number"
                  min={5}
                  max={180}
                  defaultValue={
                    person.transitPrefs?.leadTimeMinutes ??
                    DEFAULT_TRANSIT_PREFS.leadTimeMinutes
                  }
                  className="h-12 w-32 rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">
                  Lokale Abfahrten (Fallback, eine pro Zeile: HH:MM Linie Ziel)
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
                    updatePerson(person.id as PersonId, (p) => ({
                      ...p,
                      busStop: null,
                    }))
                  }
                >
                  Entfernen
                </Button>
              </div>
            </form>
          )}
        </section>
      ))}
      <p className="text-sm text-[color:var(--quiet)]">
        Hinweis: Österreich-weit benötigt VAO START eine Registrierung. Live ohne Key derzeit nur
        Wiener Linien (RBL). Sonst lokaler Fahrplan.
      </p>
    </AdminShell>
  );
}
