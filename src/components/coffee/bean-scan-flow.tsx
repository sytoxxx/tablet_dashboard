"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus } from "lucide-react";
import { useCoffeeCommand } from "@/components/coffee/coffee-command-provider";
import {
  displayScanValue,
  type BeanScanDraft,
  type BeanScanResult,
  emptyBeanScanDraft,
} from "@/lib/coffee/scan";
import { useOnlineStatus } from "@/components/admin/offline-banner";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

type Step = "upload" | "analyzing" | "confirm";

export function BeanScanFlow() {
  const router = useRouter();
  const online = useOnlineStatus();
  const { addBean } = useCoffeeCommand();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draft, setDraft] = useState<BeanScanDraft>(emptyBeanScanDraft);
  const [manual, setManual] = useState({
    name: "",
    roaster: "",
    origin: "",
    roast: "",
    notes: "",
    remainingGrams: "",
  });

  const onFile = (next: File | undefined) => {
    if (!next) return;
    if (next.size <= 0) {
      setError("Datei ist leer.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("Maximal 8 MB erlaubt.");
      return;
    }
    if (next.type && !next.type.startsWith("image/")) {
      setError("Nur Bilddateien sind erlaubt.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setError(null);
    setStep("upload");
  };

  const analyze = async () => {
    if (!file) return;
    if (!online) {
      setError("Offline – Scan nicht verfügbar. Du kannst Felder manuell ausfüllen.");
      setDraft(emptyBeanScanDraft());
      setManual({
        name: "",
        roaster: "",
        origin: "",
        roast: "",
        notes: "",
        remainingGrams: "",
      });
      setWarnings(["Offline — bitte manuell eintragen."]);
      setStep("confirm");
      return;
    }
    setError(null);
    setStep("analyzing");
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/coffee/scan-bean", { method: "POST", body: form });
      const json = (await res.json()) as BeanScanResult & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Scan fehlgeschlagen.");
      }
      const nextDraft = json.draft ?? emptyBeanScanDraft();
      setDraft(nextDraft);
      setWarnings(json.warnings ?? []);
      setManual({
        name: nextDraft.name.recognized ? nextDraft.name.value : "",
        roaster: nextDraft.roaster.recognized ? nextDraft.roaster.value : "",
        origin: nextDraft.origin.recognized ? nextDraft.origin.value : "",
        roast: nextDraft.roast.recognized ? nextDraft.roast.value : "",
        notes: nextDraft.notes.recognized ? nextDraft.notes.value : "",
        remainingGrams: "",
      });
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan fehlgeschlagen.");
      setStep("upload");
    }
  };

  const saveManualOnly = () => {
    setDraft(emptyBeanScanDraft());
    setWarnings([]);
    setManual({
      name: "",
      roaster: "",
      origin: "",
      roast: "",
      notes: "",
      remainingGrams: "",
    });
    setStep("confirm");
  };

  const confirmSave = () => {
    const name = manual.name.trim();
    if (!name) {
      setError("Name ist nötig zum Speichern.");
      return;
    }
    const remaining =
      manual.remainingGrams.trim() === ""
        ? undefined
        : Number(manual.remainingGrams);
    addBean({
      name,
      roaster: manual.roaster.trim() || undefined,
      origin: manual.origin.trim() || undefined,
      roast: manual.roast.trim() || undefined,
      notes: manual.notes.trim() || undefined,
      remainingGrams:
        remaining != null && Number.isFinite(remaining) ? remaining : undefined,
    });
    router.push("/kaffee/bohnen");
  };

  return (
    <div className="space-y-6">
      {step === "upload" || step === "analyzing" ? (
        <>
          <p className="text-lg text-[color:var(--quiet)]">
            Foto der Tüte — Kamera oder Datei. Unsichere Felder bleiben „Nicht erkannt“.
            Speichern erst nach Bestätigung.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="h-14 gap-2 rounded-2xl"
              onClick={() => cameraRef.current?.click()}
              disabled={step === "analyzing"}
            >
              <Camera className="size-5" aria-hidden />
              Kamera
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 gap-2 rounded-2xl bg-[color:var(--surface)]"
              onClick={() => fileRef.current?.click()}
              disabled={step === "analyzing"}
            >
              <ImagePlus className="size-5" aria-hidden />
              Datei
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 rounded-2xl"
              onClick={saveManualOnly}
              disabled={step === "analyzing"}
            >
              Manuell ohne Scan
            </Button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept={ACCEPT}
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Vorschau Bohnenetikett"
              className="max-h-64 w-auto rounded-[1.25rem] object-contain"
            />
          ) : null}
          {error ? (
            <p className="text-[color:var(--ink)]" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="h-14 rounded-2xl"
            disabled={!file || step === "analyzing"}
            onClick={analyze}
          >
            {step === "analyzing" ? "Analysiere …" : "Scannen"}
          </Button>
        </>
      ) : null}

      {step === "confirm" ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Prüfen & speichern</h2>
          {warnings.map((w) => (
            <p key={w} className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-[color:var(--quiet)]">
              {w}
            </p>
          ))}
          <p className="text-sm text-[color:var(--quiet)]">
            Scan-Vorschlag: Name {displayScanValue(draft.name)} · Röster{" "}
            {displayScanValue(draft.roaster)} · Herkunft {displayScanValue(draft.origin)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name *"
              value={manual.name}
              onChange={(v) => setManual((m) => ({ ...m, name: v.slice(0, 80) }))}
            />
            <Field
              label="Röster"
              value={manual.roaster}
              onChange={(v) => setManual((m) => ({ ...m, roaster: v.slice(0, 80) }))}
            />
            <Field
              label="Herkunft"
              value={manual.origin}
              onChange={(v) => setManual((m) => ({ ...m, origin: v.slice(0, 80) }))}
            />
            <Field
              label="Röstung"
              value={manual.roast}
              onChange={(v) => setManual((m) => ({ ...m, roast: v.slice(0, 40) }))}
            />
            <Field
              label="Rest (g, optional)"
              value={manual.remainingGrams}
              onChange={(v) =>
                setManual((m) => ({ ...m, remainingGrams: v.replace(/[^\d]/g, "").slice(0, 6) }))
              }
            />
          </div>
          <label className="block space-y-2">
            <span className="text-sm text-[color:var(--quiet)]">Notizen</span>
            <textarea
              rows={3}
              value={manual.notes}
              onChange={(e) =>
                setManual((m) => ({ ...m, notes: e.target.value.slice(0, 400) }))
              }
              className="w-full rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
            />
          </label>
          {error ? (
            <p className="text-[color:var(--ink)]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" size="lg" className="h-14 rounded-2xl" onClick={confirmSave}>
              Speichern
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 rounded-2xl bg-[color:var(--surface)]"
              onClick={() => {
                setStep("upload");
                setError(null);
              }}
            >
              Abbrechen
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-[color:var(--quiet)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
      />
    </label>
  );
}
