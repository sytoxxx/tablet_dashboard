"use client";

import { useRef, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useAppData } from "@/components/providers/data-provider";
import { Button } from "@/components/ui/button";
import {
  downloadAppDataJson,
  hasLocalBackup,
  loadLocalBackup,
  parseImportFile,
  saveLocalBackup,
} from "@/lib/data/backup";

export default function ImportExportPage() {
  const { data, replaceData } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupExists, setBackupExists] = useState(() =>
    typeof window !== "undefined" ? hasLocalBackup() : false,
  );

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setMessage(null);
    if (file.size > 2_000_000) {
      setError("Datei zu groß.");
      return;
    }
    if (!file.name.endsWith(".json") && file.type && file.type !== "application/json") {
      setError("Nur JSON-Dateien erlaubt.");
      return;
    }
    try {
      const text = await file.text();
      const result = parseImportFile(text);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      replaceData(result.data);
      setMessage(`Import OK — ${result.data.persons.map((p) => p.name).join(", ")}.`);
    } catch {
      setError("Import fehlgeschlagen.");
    }
  };

  return (
    <AdminShell
      title="Import / Export"
      subtitle="JSON-Backup erstellen, herunterladen, wiederherstellen — immer validiert."
    >
      <section className="space-y-4 rounded-2xl bg-[color:var(--surface)] p-5">
        <h2 className="font-display text-2xl">Export</h2>
        <p className="text-sm text-[color:var(--quiet)]">
          Version {data.version} · {data.persons.length} Profile
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            size="lg"
            className="h-12 rounded-2xl"
            onClick={() => {
              downloadAppDataJson(data);
              setMessage("JSON heruntergeladen.");
              setError(null);
            }}
          >
            JSON herunterladen
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="h-12 rounded-2xl bg-white/60"
            onClick={() => {
              const result = saveLocalBackup(data);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setBackupExists(true);
              setMessage("Lokales Backup gespeichert.");
              setError(null);
            }}
          >
            Backup erstellen
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-[color:var(--surface)] p-5">
        <h2 className="font-display text-2xl">Import</h2>
        <p className="text-sm text-[color:var(--quiet)]">
          Ersetzt lokale Daten nach Validierung. Unsichere Zeichen und fremde IDs werden entfernt.
        </p>
        <Button
          type="button"
          size="lg"
          className="h-12 rounded-2xl"
          onClick={() => fileRef.current?.click()}
        >
          JSON wählen
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => onImport(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 rounded-2xl"
          disabled={!backupExists}
          onClick={() => {
            const result = loadLocalBackup();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            replaceData(result.data);
            setMessage("Backup wiederhergestellt.");
            setError(null);
          }}
        >
          Backup wiederherstellen
        </Button>
      </section>

      {message ? (
        <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      ) : null}
    </AdminShell>
  );
}
