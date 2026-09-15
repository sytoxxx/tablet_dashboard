import type { AppData } from "@/lib/types";
import { validateAppDataImport } from "@/lib/data/validate-app-data";

const BACKUP_KEY = "coffee-morning-backup-v1";

export function buildExportPayload(data: AppData, label?: string): AppData {
  return {
    ...structuredClone(data),
    version: 3,
    meta: {
      ...data.meta,
      exportedAt: new Date().toISOString(),
      label: label || data.meta?.label || "Coffee Morning Backup",
    },
  };
}

export function downloadAppDataJson(data: AppData, filename?: string) {
  const payload = buildExportPayload(data);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ||
    `coffee-morning-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function saveLocalBackup(data: AppData): { ok: true } | { ok: false; error: string } {
  try {
    const payload = buildExportPayload(data, "Lokales Backup");
    window.localStorage.setItem(BACKUP_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch {
    return { ok: false, error: "Backup konnte nicht gespeichert werden." };
  }
}

export function loadLocalBackup():
  | { ok: true; data: AppData }
  | { ok: false; error: string } {
  try {
    const raw = window.localStorage.getItem(BACKUP_KEY);
    if (!raw) return { ok: false, error: "Kein lokales Backup vorhanden." };
    return validateAppDataImport(JSON.parse(raw));
  } catch {
    return { ok: false, error: "Backup ist beschädigt." };
  }
}

export function parseImportFile(
  text: string,
): { ok: true; data: AppData } | { ok: false; error: string } {
  if (text.length > 2_000_000) {
    return { ok: false, error: "Datei zu groß (max. ~2 MB JSON)." };
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return validateAppDataImport(parsed);
  } catch {
    return { ok: false, error: "JSON konnte nicht gelesen werden." };
  }
}

export function hasLocalBackup(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(BACKUP_KEY));
}
