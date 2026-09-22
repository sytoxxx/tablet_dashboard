"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StopSearchField } from "@/components/admin/stop-search-field";
import { BusStatusPanel } from "@/components/admin/bus-status-panel";
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

function PersonBusEditor({ personId }: { personId: PersonId }) {
  const { data, updatePerson } = useAppData();
  const person = data.persons.find((p) => p.id === personId);
  const [startName, setStartName] = useState(person?.busStop?.name ?? "");
  const [startId, setStartId] = useState(person?.busStop?.externalId ?? "");
  const [destName, setDestName] = useState(
    person?.transitPrefs?.destinationStop?.name ?? "",
  );
  const [destId, setDestId] = useState(
    person?.transitPrefs?.destinationStop?.externalId ?? "",
  );
  const [saved, setSaved] = useState(false);

  if (!person) return null;

  const isWalkingSchool =
    personId === "levi" || person.transitPrefs?.travelMode === "walking";

  if (isWalkingSchool) {
    return (
      <section className="space-y-4 border-t border-[color:var(--hairline)] pt-6">
        <h2 className="font-display text-2xl tracking-tight">{person.name}</h2>
        <p className="text-[color:var(--quiet)]">
          Schulweg zu Fuß — keine Busplanung für den Morgen.
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const desiredArrivalHHmm = String(fd.get("desiredArrivalHHmm") || "")
              .trim()
              .slice(0, 5);
            const desiredArrivalEndHHmm = String(
              fd.get("desiredArrivalEndHHmm") || "",
            )
              .trim()
              .slice(0, 5);
            const destinationLabel = String(fd.get("destinationLabel") || "")
              .replace(/[<>]/g, "")
              .slice(0, 80);
            const clampPref = (key: string, fallback: number) =>
              Math.min(
                180,
                Math.max(0, Number(fd.get(key) ?? fallback) || fallback),
              );
            updatePerson(personId, (p) => ({
              ...p,
              displayPrefs: { ...p.displayPrefs, showBus: false },
              transitPrefs: {
                ...DEFAULT_TRANSIT_PREFS,
                ...p.transitPrefs,
                enabled: false,
                travelMode: "walking",
                desiredArrivalHHmm: /^\d{2}:\d{2}$/.test(desiredArrivalHHmm)
                  ? desiredArrivalHHmm
                  : p.transitPrefs?.desiredArrivalHHmm,
                desiredArrivalEndHHmm: /^\d{2}:\d{2}$/.test(desiredArrivalEndHHmm)
                  ? desiredArrivalEndHHmm
                  : undefined,
                destinationLabel: destinationLabel || "HTL Kapfenberg",
                destinationStop: {
                  name: destinationLabel || "HTL Kapfenberg",
                },
                walkToStopMinutes: clampPref(
                  "walkToStopMinutes",
                  p.transitPrefs?.walkToStopMinutes ?? 10,
                ),
                preparationMinutes: clampPref(
                  "preparationMinutes",
                  p.transitPrefs?.preparationMinutes ?? 5,
                ),
                safetyBufferMinutes: clampPref(
                  "safetyBufferMinutes",
                  p.transitPrefs?.safetyBufferMinutes ?? 0,
                ),
                stopToWorkMinutes: 0,
                preferredModes: [],
              },
            }));
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2000);
          }}
        >
          <label className="block space-y-1">
            <span className="text-sm text-[color:var(--quiet)]">Ziel (z. B. HTL Kapfenberg)</span>
            <input
              name="destinationLabel"
              defaultValue={
                person.transitPrefs?.destinationLabel ??
                person.transitPrefs?.destinationStop?.name ??
                "HTL Kapfenberg"
              }
              className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">Ankunft von (HH:MM)</span>
              <input
                name="desiredArrivalHHmm"
                defaultValue={person.transitPrefs?.desiredArrivalHHmm ?? "07:45"}
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">Ankunft bis (HH:MM)</span>
              <input
                name="desiredArrivalEndHHmm"
                defaultValue={person.transitPrefs?.desiredArrivalEndHHmm ?? "07:50"}
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">Gehzeit (Min.)</span>
              <input
                name="walkToStopMinutes"
                type="number"
                min={0}
                max={180}
                defaultValue={person.transitPrefs?.walkToStopMinutes ?? 10}
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">Vorbereitung (Min.)</span>
              <input
                name="preparationMinutes"
                type="number"
                min={0}
                max={180}
                defaultValue={person.transitPrefs?.preparationMinutes ?? 5}
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">Sicherheitspuffer (Min.)</span>
              <input
                name="safetyBufferMinutes"
                type="number"
                min={0}
                max={180}
                defaultValue={person.transitPrefs?.safetyBufferMinutes ?? 0}
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
          </div>
          <Button type="submit" size="lg" className="h-12 rounded-2xl">
            Speichern
          </Button>
          {saved ? (
            <p className="text-sm text-[color:var(--quiet)]">Gespeichert.</p>
          ) : null}
        </form>
      </section>
    );
  }

  if (!person.busStop) {
    return (
      <section className="space-y-4 border-t border-[color:var(--hairline)] pt-6">
        <h2 className="font-display text-2xl tracking-tight">{person.name}</h2>
        <p className="text-[color:var(--quiet)]">Keine Start-Haltestelle konfiguriert.</p>
        <Button
          type="button"
          size="lg"
          className="h-12 rounded-2xl"
          onClick={() =>
            updatePerson(personId, (p) => ({
              ...p,
              busStop: {
                name: "Start-Haltestelle",
                departures: [],
                provider: "auto",
              },
              transitPrefs: {
                ...DEFAULT_TRANSIT_PREFS,
                ...p.transitPrefs,
                enabled: true,
                travelMode: "bus",
              },
            }))
          }
        >
          Start-Haltestelle anlegen
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4 border-t border-[color:var(--hairline)] pt-6">
      <h2 className="font-display text-2xl tracking-tight">{person.name}</h2>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
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
            Math.max(
              5,
              Number(fd.get("leadTimeMinutes") || DEFAULT_TRANSIT_PREFS.leadTimeMinutes),
            ),
          );
          const clampPref = (key: string, fallback: number) =>
            Math.min(
              180,
              Math.max(0, Number(fd.get(key) ?? fallback) || fallback),
            );
          const walkToStopMinutes = clampPref(
            "walkToStopMinutes",
            person.transitPrefs?.walkToStopMinutes ??
              DEFAULT_TRANSIT_PREFS.walkToStopMinutes ??
              0,
          );
          const stopToWorkMinutes = clampPref(
            "stopToWorkMinutes",
            person.transitPrefs?.stopToWorkMinutes ??
              DEFAULT_TRANSIT_PREFS.stopToWorkMinutes ??
              0,
          );
          const preparationMinutes = clampPref(
            "preparationMinutes",
            person.transitPrefs?.preparationMinutes ??
              DEFAULT_TRANSIT_PREFS.preparationMinutes ??
              0,
          );
          const safetyBufferMinutes = clampPref(
            "safetyBufferMinutes",
            person.transitPrefs?.safetyBufferMinutes ??
              DEFAULT_TRANSIT_PREFS.safetyBufferMinutes ??
              5,
          );
          const typicalWorkStartHHmm = String(fd.get("typicalWorkStartHHmm") || "")
            .trim()
            .slice(0, 5);
          const typicalWorkEndHHmm = String(fd.get("typicalWorkEndHHmm") || "")
            .trim()
            .slice(0, 5);
          const enabled = fd.get("enabled") === "on";
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
                id: `${personId}-dep-${index}`,
                time: time ?? "00:00",
                line: (busLine ?? "?").replace(/[<>]/g, "").slice(0, 12),
                destination:
                  destParts.join(" ").replace(/[<>]/g, "").slice(0, 60) || "—",
              };
            });
          const cleanStart = startName.replace(/[<>]/g, "").slice(0, 80);
          const cleanStartId = startId.replace(/[<>\s]/g, "").slice(0, 64);
          const cleanDest = destName.replace(/[<>]/g, "").slice(0, 80);
          const cleanDestId = destId.replace(/[<>\s]/g, "").slice(0, 64);
          updatePerson(personId, (p) => ({
            ...p,
            busStop: {
              name: cleanStart || "Start-Haltestelle",
              departures: lines,
              externalId: cleanStartId || undefined,
              provider,
            },
            transitPrefs: {
              enabled,
              leadTimeMinutes,
              desiredArrivalHHmm: /^\d{2}:\d{2}$/.test(desiredArrivalHHmm)
                ? desiredArrivalHHmm
                : undefined,
              preferredLines: preferredLine ? [preferredLine] : undefined,
              preferredModes: preferredModes.length ? preferredModes : undefined,
              destinationStop: cleanDest
                ? {
                    name: cleanDest,
                    externalId: cleanDestId || undefined,
                  }
                : undefined,
              destinationHint: destinationHint || undefined,
              walkToStopMinutes,
              stopToWorkMinutes,
              preparationMinutes,
              safetyBufferMinutes,
              typicalWorkStartHHmm: /^\d{2}:\d{2}$/.test(typicalWorkStartHHmm)
                ? typicalWorkStartHHmm
                : undefined,
              typicalWorkEndHHmm: /^\d{2}:\d{2}$/.test(typicalWorkEndHHmm)
                ? typicalWorkEndHHmm
                : undefined,
            },
          }));
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2000);
        }}
      >
        <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-[color:var(--surface)] px-4">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={person.transitPrefs?.enabled !== false}
          />
          <span>Bus aktiv (Morning anzeigen)</span>
        </label>

        <StopSearchField
          label="Start-Haltestelle"
          nameValue={startName}
          idValue={startId}
          onNameChange={setStartName}
          onIdChange={setStartId}
          nameInputName="stopName"
          idInputName="externalId"
          placeholder="z. B. Kapfenberg — Name aus Suche oder manuell"
        />

        <StopSearchField
          label="Ziel-Haltestelle"
          nameValue={destName}
          idValue={destId}
          onNameChange={setDestName}
          onIdChange={setDestId}
          nameInputName="destinationStopName"
          idInputName="destinationStopId"
          placeholder="z. B. Bruck/Mur oder Apfelmoar — aus Suche oder manuell"
        />

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
            <span className="text-sm text-[color:var(--quiet)]">Vorlaufzeit / Fahrzeit-Schätzung (Minuten)</span>
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

        {personId === "birgit" || personId === "heidi" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">
                Fußweg Zuhause → Haltestelle (Min.)
              </span>
              <input
                name="walkToStopMinutes"
                type="number"
                min={0}
                max={180}
                defaultValue={
                  person.transitPrefs?.walkToStopMinutes ??
                  DEFAULT_TRANSIT_PREFS.walkToStopMinutes ??
                  0
                }
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">
                Fußweg Haltestelle → Arbeit (Min.)
              </span>
              <input
                name="stopToWorkMinutes"
                type="number"
                min={0}
                max={180}
                defaultValue={
                  person.transitPrefs?.stopToWorkMinutes ??
                  DEFAULT_TRANSIT_PREFS.stopToWorkMinutes ??
                  0
                }
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">
                Vorbereitungszeit (Min.)
              </span>
              <input
                name="preparationMinutes"
                type="number"
                min={0}
                max={180}
                defaultValue={
                  person.transitPrefs?.preparationMinutes ??
                  DEFAULT_TRANSIT_PREFS.preparationMinutes ??
                  0
                }
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">
                Sicherheitspuffer (Min.)
              </span>
              <input
                name="safetyBufferMinutes"
                type="number"
                min={0}
                max={180}
                defaultValue={
                  person.transitPrefs?.safetyBufferMinutes ??
                  DEFAULT_TRANSIT_PREFS.safetyBufferMinutes ??
                  5
                }
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
          </div>
        ) : null}

        {personId === "birgit" || personId === "heidi" ? (
          <div className="space-y-2 rounded-2xl border border-[color:var(--hairline)] p-4">
            <p className="text-sm font-medium text-[color:var(--ink)]">
              Typische Arbeitszeit (Orientierung)
            </p>
            <p className="text-sm text-[color:var(--quiet)]">
              Wird NUR verwendet, um den Bus zu planen, solange für den aktuellen Tag noch kein
              bestätigter Monatsplan vorliegt. Wird nie als bestätigter Dienst angezeigt — dafür
              zählt ausschließlich der eingescannte Monatsplan.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">Übliche Arbeitszeit von (HH:MM)</span>
                <input
                  name="typicalWorkStartHHmm"
                  placeholder="06:00"
                  defaultValue={person.transitPrefs?.typicalWorkStartHHmm ?? ""}
                  className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">Übliche Arbeitszeit bis (HH:MM)</span>
                <input
                  name="typicalWorkEndHHmm"
                  placeholder="12:00"
                  defaultValue={person.transitPrefs?.typicalWorkEndHHmm ?? ""}
                  className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
            </div>
          </div>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm text-[color:var(--quiet)]">Bevorzugte Linie (optional)</span>
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
            Lokale Abfahrten / Testdaten (Fallback, eine pro Zeile: HH:MM Linie Ziel) — klar als
            Testdaten kennzeichnen, z. B. mit [TEST]
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
            {saved ? "Gespeichert" : "Speichern"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 rounded-2xl"
            onClick={() =>
              updatePerson(personId, (p) => ({
                ...p,
                busStop: null,
              }))
            }
          >
            Entfernen
          </Button>
        </div>
      </form>
    </section>
  );
}

export default function BusSettingsPage() {
  const { data } = useAppData();

  return (
    <AdminShell
      title="Bus"
      subtitle="Pro Person: Start, Ziel, Ankunft, Vorlauf, Linie, Verkehrsmittel, aktiv. Live-Suche nur mit TRIAS/VAO."
    >
      <p className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--quiet)]">
        Region: {data.region?.label ?? "nicht gesetzt"}. Keine Haltestellen-IDs erfinden — Suche
        nutzen oder manuell als Test-Konfiguration.
      </p>

      <BusStatusPanel preferredProvider={data.region?.preferredBusProvider ?? "auto"} />

      {data.persons.map((person) => (
        <PersonBusEditor
          key={`${person.id}-${person.busStop ? "cfg" : "empty"}`}
          personId={person.id as PersonId}
        />
      ))}

      <p className="text-sm text-[color:var(--quiet)]">
        Live: Verbund Steiermark TRIAS (`VERBUND_STEIERMARK_TRIAS_URL`) oder VAO START
        (`VAO_API_KEY` + `VAO_BASE_URL`). Wiener Linien nur optional. Ohne Zugang: lokale
        Testdaten — nie als Live gekennzeichnet.
      </p>
    </AdminShell>
  );
}
