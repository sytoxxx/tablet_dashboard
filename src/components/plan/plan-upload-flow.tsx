"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, X } from "lucide-react";
import { AppNav } from "@/components/shared/app-nav";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/components/providers/data-provider";
import { PlanPreviewEditor } from "@/components/plan/plan-preview-editor";
import {
  PlanConflictResolver,
} from "@/components/plan/plan-conflict-resolver";
import type { ConflictResolution } from "@/lib/data/conflict-resolution";
import { detectDraftConflicts } from "@/lib/data/conflicts";
import { useOnlineStatus } from "@/components/admin/offline-banner";
import type { PersonId } from "@/lib/types";
import type { PlanAnalysisMode, PlanAnalysisResult } from "@/lib/plan-analysis/types";
import {
  applyPlanDraft,
  defaultPlanTypeForPerson,
  personHasScheduleContent,
  type ApplyMode,
} from "@/lib/plan-analysis/apply";
import { cn } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

type Step = "upload" | "analyzing" | "preview" | "editor" | "saved";

function validateImageFile(file: File): string | null {
  if (file.size <= 0) return "Datei ist leer.";
  if (file.size > MAX_BYTES) return "Maximal 8 MB erlaubt.";
  if (file.type && !file.type.startsWith("image/")) {
    return "Nur Bilddateien sind erlaubt.";
  }
  return null;
}

export function PlanUploadFlow({
  embedded = false,
  initialPersonId,
}: {
  embedded?: boolean;
  initialPersonId?: PersonId;
}) {
  const router = useRouter();
  const online = useOnlineStatus();
  const { data, updatePerson } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [personId, setPersonId] = useState<PersonId>(initialPersonId ?? "levi");
  const person = data.persons.find((p) => p.id === personId) ?? data.persons[0];

  const [planType, setPlanType] = useState<PlanAnalysisMode>(() =>
    person ? defaultPlanTypeForPerson(person) : "school",
  );

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PlanAnalysisResult | null>(null);
  const [applyMode, setApplyMode] = useState<ApplyMode>("replace");
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});

  const hasExisting = useMemo(
    () => (person ? personHasScheduleContent(person, planType) : false),
    [person, planType],
  );

  const conflicts = useMemo(() => {
    if (!analysis || !person || applyMode === "replace") return [];
    return detectDraftConflicts(person.schedule, analysis.draft);
  }, [analysis, person, applyMode]);

  const onSelectPerson = (id: PersonId) => {
    setPersonId(id);
    const next = data.persons.find((p) => p.id === id);
    if (next) setPlanType(defaultPlanTypeForPerson(next));
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setAnalysis(null);
    setResolutions({});
    setStep("upload");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const onFile = (next: File | undefined) => {
    if (!next) return;
    const validationError = validateImageFile(next);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setAnalysis(null);
    setResolutions({});
    setError(null);
    setStep("upload");
  };

  const analyze = async () => {
    if (!file || !person) return;
    if (!online) {
      setError("Offline – KI-Analyse ist nicht verfügbar. Gespeicherte Pläne bleiben nutzbar.");
      return;
    }
    setError(null);
    setStep("analyzing");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("personId", person.id);
      body.append("planType", planType);
      body.append("personName", person.name);
      const res = await fetch("/api/plan/analyze", { method: "POST", body });
      const json = (await res.json()) as PlanAnalysisResult & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Analyse fehlgeschlagen.");
      }
      setAnalysis(json);
      setApplyMode(hasExisting ? "merge" : "replace");
      setResolutions({});
      setStep("preview");
    } catch (e) {
      const message =
        e instanceof TypeError
          ? "Netzwerkfehler – offline oder Server nicht erreichbar."
          : e instanceof Error
            ? e.message
            : "Analyse fehlgeschlagen.";
      setError(message);
      setStep("upload");
    }
  };

  const confirmSave = () => {
    if (!analysis || !person) return;
    updatePerson(person.id, (p) =>
      applyPlanDraft(p, analysis.draft, applyMode, { conflicts, resolutions }),
    );
    setStep("saved");
  };

  const shell = (children: ReactNode) =>
    embedded ? (
      <div className="space-y-8">{children}</div>
    ) : (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6 sm:px-8">
        <AppNav showSettings={false} backLabel="Einstellungen" backHref="/einstellungen" />
        {children}
      </main>
    );

  return shell(
    <>
      {!embedded ? (
        <header className="space-y-2">
          <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">
            Plan aktualisieren
          </p>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">KI-Planerkennung</h1>
          <p className="text-lg text-[color:var(--quiet)]">
            Foto → Analyse → Draft → Bearbeiten → Konflikte → Speichern. Nichts wird automatisch
            ersetzt.
          </p>
        </header>
      ) : null}

      {!online ? (
        <p role="status" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Offline – zuletzt gespeicherte Daten. KI-Analyse ist deaktiviert.
        </p>
      ) : null}

      {step !== "saved" ? (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
              Person
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.persons.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPerson(p.id)}
                  className={cn(
                    "min-h-12 rounded-2xl px-4 text-base transition-transform active:scale-[0.97]",
                    personId === p.id
                      ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                      : "bg-[color:var(--surface)]",
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
              Plan-Typ
            </h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "school", label: "Stundenplan" },
                  { id: "work", label: "Arbeitsplan" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPlanType(opt.id)}
                  className={cn(
                    "min-h-12 rounded-2xl px-4 text-base transition-transform active:scale-[0.97]",
                    planType === opt.id
                      ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                      : "bg-[color:var(--surface)]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {step === "upload" || step === "analyzing" ? (
        <>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="h-14 gap-2 rounded-2xl px-5 active:scale-[0.97]"
              onClick={() => fileRef.current?.click()}
              disabled={step === "analyzing"}
            >
              <ImagePlus className="size-5" aria-hidden />
              Bild auswählen
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 gap-2 rounded-2xl bg-[color:var(--surface)] px-5 active:scale-[0.97]"
              onClick={() => cameraRef.current?.click()}
              disabled={step === "analyzing"}
            >
              <Camera className="size-5" aria-hidden />
              Foto aufnehmen
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>

          {previewUrl ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm text-[color:var(--quiet)]">{file?.name}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={clearFile}
                  disabled={step === "analyzing"}
                >
                  <X className="size-4" /> Entfernen
                </Button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Vorschau des Plans"
                className="max-h-[45vh] w-full rounded-[1.5rem] object-contain bg-[color:var(--surface)]"
              />
            </div>
          ) : (
            <div className="rounded-[1.5rem] bg-[color:var(--surface)] px-6 py-16 text-center text-[color:var(--quiet)]">
              Noch kein Bild — auswählen oder Kamera nutzen.
            </div>
          )}

          {error ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="h-14 rounded-2xl text-base active:scale-[0.97]"
            disabled={!file || step === "analyzing" || !online}
            onClick={analyze}
          >
            {step === "analyzing" ? "Plan wird analysiert …" : "Plan analysieren"}
          </Button>
        </>
      ) : null}

      {(step === "preview" || step === "editor") && analysis ? (
        <div className="space-y-8">
          <PlanPreviewEditor result={analysis} onChange={setAnalysis} />

          {hasExisting ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
                Speichern
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(
                    "min-h-12 rounded-2xl px-4",
                    applyMode === "replace"
                      ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                      : "bg-[color:var(--surface)]",
                  )}
                  onClick={() => setApplyMode("replace")}
                >
                  Ersetzen
                </button>
                <button
                  type="button"
                  className={cn(
                    "min-h-12 rounded-2xl px-4",
                    applyMode === "merge"
                      ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                      : "bg-[color:var(--surface)]",
                  )}
                  onClick={() => setApplyMode("merge")}
                >
                  Ergänzen
                </button>
              </div>
            </section>
          ) : null}

          {applyMode === "merge" ? (
            <PlanConflictResolver
              conflicts={conflicts}
              resolutions={resolutions}
              onChange={(key, value) =>
                setResolutions((prev) => ({ ...prev, [key]: value }))
              }
            />
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="h-14 rounded-2xl px-6 active:scale-[0.97]"
              onClick={confirmSave}
            >
              ✓ Plan übernehmen
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 rounded-2xl bg-[color:var(--surface)] px-6"
              onClick={() => router.push("/einstellungen/plaene")}
            >
              Im Plan-Editor öffnen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 rounded-2xl px-6"
              onClick={() => {
                setAnalysis(null);
                setResolutions({});
                setStep("upload");
              }}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      ) : null}

      {step === "saved" ? (
        <div className="space-y-6">
          <p role="status" className="rounded-2xl bg-[color:var(--surface)] px-5 py-4 text-lg">
            Plan gespeichert für {person?.name}. Die Daten bleiben nach Reload erhalten.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="h-14 rounded-2xl"
              onClick={() => router.push(`/person/${personId}`)}
            >
              Zum Dashboard
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 rounded-2xl bg-[color:var(--surface)]"
              onClick={() => router.push("/einstellungen/plaene")}
            >
              Plan-Editor
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 rounded-2xl"
              onClick={clearFile}
            >
              Weiteren Plan
            </Button>
          </div>
        </div>
      ) : null}
    </>,
  );
}
