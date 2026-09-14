"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useAppData } from "@/components/providers/data-provider";
import type { BusProviderPreference, PersonId, TransitModePreference } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";

const PROVIDERS: Array<{ value: BusProviderPreference; label: string }> = [
  { value: "auto", label: "Auto (Steiermark → VAO → WL → lokal)" },
  { value: "verbund-steiermark", label: "Verbund Steiermark (TRIAS)" },
  { value: "vao", label: "VAO START" },
  { value: "wienerlinien", label: "Wiener Linien (optional)" },
  { value: "local", label: "Lokaler Plan / Testdaten" },
  { value: "mock", label: "Mock" },
];

const MODES: TransitModePreference[] = ["bus", "tram", "train", "subway", "other"];

export default function BusSettingsPage() {
  const { data, updatePerson } = useAppData();

  return (
    <AdminShell
      title="Bus"
      subtitle="Pro Person: Start, Ziel, Ankunft, Vorlauf, Verkehrsmittel. Live über Verbund Steiermark / VAO — Wiener Linien nur optional."
    >
      <p className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--quiet)]">
        Region: {data.region?.label ?? "nicht gesetzt"} — konkrete Haltestellen-IDs bitte selbst
        eintragen (keine erfundenen StopPointRefs).
      </p>

      {data.persons.map((person) => (
        <section key={person.id} className="space-y-4 border-t border-[color:var(--hairline)] pt-6">
          <h2 className="font-display text-2xl tracking-tight">{person.name}</h2>
          {!person.busStop ? (
            <div className="space-y-3">
              <p className="text-[color:var(--quiet)]">Keine Start-Haltestelle konfiguriert.</p>
              <Button
                type="button"
                size="lg"
                className="h-12 rounded-2xl"
                onClick={() =>
                  updatePerson(person.id as PersonId, (p) => ({
                    ...p,
                    busStop: {
                      name: "Start-Haltestelle",
                      departures: [],
                      provider: "auto",
                    },
                    transitPrefs: p.transitPrefs ?? DEFAULT_TRANSIT_PREFS,
                  }))
                }
              >
                Start-Haltestelle anlegen
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
                  .slice(0, 80);
                const externalId = String(fd.get("externalId") || "")
                  .replace(/[<>\s]/g, "")
                  .slice(0, 64);
                const destinationStopName = String(fd.get("destinationStopName") || "")
                  .replace(/[<>]/g, "")
                  .slice(0, 80);
                const destinationStopId = String(fd.get("destinationStopId") || "")
                  .replace(/[<>\s]/g, "")
                  .slice(0, 64);
                const destinationHint = String(fd.get("destinationHint") || "")
                  .replace(/[<>]/g, "")
                  .slice(0, 40);
                const desiredArrivalHHmm = String(fd.get("desiredArrivalHHmm") || "")
                  .trim()
                  .slice(0, 5);
                const preferredLine = String(fd.get("preferredLine") || "")
                  .replace(/[<>]/g, "")
                  .slice(0, 16);
                const leadTimeMinutes = Math.min(
                  180,
                  Math.max(5, Number(fd.get("leadTimeMinutes") || DEFAULT_TRANSIT_PREFS.leadTimeMinutes)),
                );
                const providerRaw = String(fd.get("provider") || "auto");
                const provider = (
                  PROVIDERS.some((p) => p.value === providerRaw) ? providerRaw : "auto"
                ) as BusProviderPreference;
                const preferredModes = MODES.filter((m) => fd.get(`mode-${m}`) === "on");
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
                  transitPrefs: {
                    leadTimeMinutes,
                    desiredArrivalHHmm: /^\d{2}:\d{2}$/.test(desiredArrivalHHmm)
                      ? desiredArrivalHHmm
                      : undefined,
                    preferredLines: preferredLine ? [preferredLine] : undefined,
                    preferredModes: preferredModes.length ? preferredModes : undefined,
                    destinationStop: destinationStopName
                      ? {
                          name: destinationStopName,
                          externalId: destinationStopId || undefined,
                        }
                      : undefined,
                    destinationHint: destinationHint || undefined,
                  },
                }));
              }}
            >
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">Start-Haltestelle</span>
                <input
                  name="stopName"
                  defaultValue={person.busStop.name}
                  className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">
                  Stop-ID / StopPointRef (TRIAS, VAO oder RBL — leer = nur lokaler Plan)
                </span>
                <input
                  name="externalId"
                  defaultValue={person.busStop.externalId ?? ""}
                  placeholder="aus Verbund-Linie / VAO, nicht erfinden"
                  className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">Ziel-Haltestelle</span>
                <input
                  name="destinationStopName"
                  defaultValue={person.transitPrefs?.destinationStop?.name ?? ""}
                  placeholder="z. B. Bereich Bruck/Mur — im Admin konkretisieren"
                  className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">
                  Ziel Stop-ID (optional)
                </span>
                <input
                  name="destinationStopId"
                  defaultValue={person.transitPrefs?.destinationStop?.externalId ?? ""}
                  className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">
                  Ziel-Hinweis für Abfahrtsfilter (z. B. Bruck, Apfelmoar)
                </span>
                <input
                  name="destinationHint"
                  defaultValue={person.transitPrefs?.destinationHint ?? ""}
                  className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm text-[color:var(--quiet)]">
                    Gewünschte Ankunft (HH:MM, leer = Arbeits-/Schulbeginn)
                  </span>
                  <input
                    name="desiredArrivalHHmm"
                    placeholder="06:00"
                    defaultValue={person.transitPrefs?.desiredArrivalHHmm ?? ""}
                    className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm text-[color:var(--quiet)]">Vorlaufzeit (Minuten)</span>
                  <input
                    name="leadTimeMinutes"
                    type="number"
                    min={5}
                    max={180}
                    defaultValue={
                      person.transitPrefs?.leadTimeMinutes ??
                      DEFAULT_TRANSIT_PREFS.leadTimeMinutes
                    }
                    className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">
                  Bevorzugte Linie (optional)
                </span>
                <input
                  name="preferredLine"
                  defaultValue={person.transitPrefs?.preferredLines?.[0] ?? ""}
                  className="h-12 w-40 rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm text-[color:var(--quiet)]">
                  Bevorzugte Verkehrsmittel
                </legend>
                <div className="flex flex-wrap gap-2">
                  {MODES.map((mode) => (
                    <label
                      key={mode}
                      className="flex min-h-11 items-center gap-2 rounded-2xl bg-[color:var(--surface)] px-4"
                    >
                      <input
                        type="checkbox"
                        name={`mode-${mode}`}
                        defaultChecked={
                          person.transitPrefs?.preferredModes?.includes(mode) ?? mode === "bus"
                        }
                      />
                      {mode}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm text-[color:var(--quiet)]">Bus-Provider</legend>
                <div className="flex flex-col gap-2">
                  {PROVIDERS.map((p) => (
                    <label
                      key={p.value}
                      className="flex min-h-11 items-center gap-2 rounded-2xl bg-[color:var(--surface)] px-4"
                    >
                      <input
                        type="radio"
                        name="provider"
                        value={p.value}
                        defaultChecked={(person.busStop?.provider ?? "auto") === p.value}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">
                  Lokale Abfahrten / Testdaten (Fallback, eine pro Zeile: HH:MM Linie Ziel)
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
        Live: Verbund Steiermark TRIAS (`VERBUND_STEIERMARK_TRIAS_URL`) oder VAO START
        (`VAO_API_KEY` + `VAO_BASE_URL`). Wiener Linien nur optional für Wien. Ohne Zugang:
        lokaler Plan / Testdaten.
      </p>
    </AdminShell>
  );
}
