"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useOnlineStatus } from "@/components/admin/offline-banner";
import { useAppData } from "@/components/providers/data-provider";
import { Button } from "@/components/ui/button";
import { STORAGE_KEY } from "@/data/repository";
import { hasLocalBackup } from "@/lib/data/backup";

export default function SystemSettingsPage() {
  const { data, resetToSeed } = useAppData();
  const online = useOnlineStatus();
  const [backupExists, setBackupExists] = useState(false);

  useEffect(() => {
    setBackupExists(hasLocalBackup());
  }, [data]);

  return (
    <AdminShell title="System" subtitle="Status, Speicher und Zurücksetzen.">
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
