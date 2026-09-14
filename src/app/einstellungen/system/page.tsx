"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useOnlineStatus } from "@/components/admin/offline-banner";
import { useAppData } from "@/components/providers/data-provider";
import { Button } from "@/components/ui/button";
import { STORAGE_KEY } from "@/data/repository";
import { hasLocalBackup } from "@/lib/data/backup";
import { DEFAULT_REGION } from "@/lib/data/defaults";
import type { BusProviderPreference } from "@/lib/types";

const PROVIDERS: BusProviderPreference[] = [
  "auto",
  "verbund-steiermark",
  "vao",
  "wienerlinien",
  "local",
  "mock",
];

export default function SystemSettingsPage() {
  const { data, resetToSeed, replaceData } = useAppData();
  const online = useOnlineStatus();
  const [backupExists, setBackupExists] = useState(false);
  const region = data.region ?? DEFAULT_REGION;

  useEffect(() => {
    setBackupExists(hasLocalBackup());
  }, [data]);

  return (
    <AdminShell title="System" subtitle="Region, Status, Speicher und Zurücksetzen.">
      <form
        className="space-y-4 rounded-2xl bg-[color:var(--surface)] p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const label = String(fd.get("regionLabel") || region.label)
            .replace(/[<>]/g, "")
            .slice(0, 120);
          const notes = String(fd.get("regionNotes") || "")
            .replace(/[<>]/g, "")
            .slice(0, 400);
          const place = String(fd.get("weatherPlace") || region.defaultWeatherLocation.place)
            .replace(/[<>]/g, "")
            .slice(0, 60);
          const latitude = Number(fd.get("weatherLat"));
          const longitude = Number(fd.get("weatherLon"));
          const preferredRaw = String(fd.get("preferredBusProvider") || "auto");
          const preferredBusProvider = (
            PROVIDERS.includes(preferredRaw as BusProviderPreference)
              ? preferredRaw
              : "auto"
          ) as BusProviderPreference;
          replaceData({
            ...data,
            region: {
              label,
              notes: notes || undefined,
              preferredBusProvider,
              defaultWeatherLocation: {
                place,
                latitude: Number.isFinite(latitude)
                  ? latitude
                  : region.defaultWeatherLocation.latitude,
                longitude: Number.isFinite(longitude)
                  ? longitude
                  : region.defaultWeatherLocation.longitude,
              },
            },
          });
        }}
      >
        <h2 className="font-display text-xl tracking-tight">Region</h2>
        <p className="text-sm text-[color:var(--quiet)]">
          Einsatzort ist konfigurierbar — Kapfenberg/Bruck/Apfelmoar sind aktuelle Defaults, nicht
          fest verdrahtet.
        </p>
        <label className="block space-y-1">
          <span className="text-sm text-[color:var(--quiet)]">Regionsname</span>
          <input
            name="regionLabel"
            defaultValue={region.label}
            className="h-12 w-full rounded-2xl bg-[color:var(--bg)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-[color:var(--quiet)]">Hinweise / Zone</span>
          <textarea
            name="regionNotes"
            rows={3}
            defaultValue={region.notes ?? ""}
            className="w-full rounded-2xl bg-[color:var(--bg)] px-4 py-3 text-sm outline-none ring-[color:var(--brand)] focus:ring-2"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1 sm:col-span-1">
            <span className="text-sm text-[color:var(--quiet)]">Wetter-Ort</span>
            <input
              name="weatherPlace"
              defaultValue={region.defaultWeatherLocation.place}
              className="h-12 w-full rounded-2xl bg-[color:var(--bg)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-[color:var(--quiet)]">Lat</span>
            <input
              name="weatherLat"
              type="number"
              step="0.0001"
              defaultValue={region.defaultWeatherLocation.latitude}
              className="h-12 w-full rounded-2xl bg-[color:var(--bg)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-[color:var(--quiet)]">Lon</span>
            <input
              name="weatherLon"
              type="number"
              step="0.0001"
              defaultValue={region.defaultWeatherLocation.longitude}
              className="h-12 w-full rounded-2xl bg-[color:var(--bg)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-sm text-[color:var(--quiet)]">Bevorzugter Bus-Provider</span>
          <select
            name="preferredBusProvider"
            defaultValue={region.preferredBusProvider ?? "auto"}
            className="h-12 w-full rounded-2xl bg-[color:var(--bg)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="lg" className="h-12 rounded-2xl">
          Region speichern
        </Button>
      </form>

      <dl className="grid gap-4 rounded-2xl bg-[color:var(--surface)] p-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-[color:var(--quiet)]">Netzwerk</dt>
          <dd className="text-lg font-medium">{online ? "Online" : "Offline"}</dd>
        </div>
        <div>
          <dt className="text-sm text-[color:var(--quiet)]">Datenversion</dt>
          <dd className="text-lg font-medium">{data.version}</dd>
        </div>
        <div>
          <dt className="text-sm text-[color:var(--quiet)]">LocalStorage-Key</dt>
          <dd className="font-mono text-sm">{STORAGE_KEY}</dd>
        </div>
        <div>
          <dt className="text-sm text-[color:var(--quiet)]">Lokales Backup</dt>
          <dd className="text-lg font-medium">{backupExists ? "Vorhanden" : "Keins"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm text-[color:var(--quiet)]">Profile</dt>
          <dd className="text-lg font-medium">
            {data.persons.map((p) => `${p.name} (${p.schedule.type})`).join(" · ")}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm text-[color:var(--quiet)]">KI</dt>
          <dd className="text-sm text-[color:var(--quiet)]">
            Schlüssel nur serverseitig (`OPENAI_API_KEY`). Ohne Key: Mock-Analyse. Offline: Analyse
            deaktiviert, gespeicherte Daten bleiben sichtbar.
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 rounded-2xl"
        onClick={() => {
          if (window.confirm("Alle lokalen Änderungen verwerfen und Seed laden?")) {
            resetToSeed();
          }
        }}
      >
        Auf Standard zurücksetzen
      </Button>
    </AdminShell>
  );
}
