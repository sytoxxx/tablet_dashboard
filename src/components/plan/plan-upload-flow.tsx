"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, X } from "lucide-react";
import { AppNav } from "@/components/shared/app-nav";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/components/providers/data-provider";
import { PlanPreviewEditor } from "@/components/plan/plan-preview-editor";
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

type Step = "upload" | "analyzing" | "preview" | "saved";

function validateImageFile(file: File): string | null {
  if (file.size <= 0) return "Datei ist leer.";
  if (file.size > MAX_BYTES) return "Maximal 8 MB erlaubt.";
  if (file.type && !file.type.startsWith("image/")) {
    return "Nur Bilddateien sind erlaubt.";
  }
  return null;
}

export function PlanUploadFlow() {
  const router = useRouter();
  const { data, updatePerson } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [personId, setPersonId] = useState<PersonId>("levi");
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

  const hasExisting = useMemo(
    () => (person ? personHasScheduleContent(person, planType) : false),
    [person, planType],
  );

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
    setError(null);
    setStep("upload");
  };

  const analyze = async () => {
    if (!file || !person) return;
    setError(null);
    setStep("analyzing");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("personId", person.id);
      body.append("planType", planType);
      const res = await fetch("/api/plan/analyze", { method: "POST", body });
      const json = (await res.json()) as PlanAnalysisResult & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Analyse fehlgeschlagen.");
      }
      setAnalysis(json);
      setApplyMode(hasExisting ? "merge" : "replace");
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse fehlgeschlagen.");
      setStep("upload");
    }
  };

  const confirmSave = () => {
    if (!analysis || !person) return;
    updatePerson(person.id, (p) => applyPlanDraft(p, analysis.draft, applyMode));
    setStep("saved");
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6 sm:px-8">
      <AppNav showSettings={false} backLabel="Einstellungen" backHref="/einstellungen" />

      <header className="space-y-2">
        <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">
          Plan aktualisieren
        </p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">KI-Planerkennung</h1>
        <p className="text-lg text-[color:var(--quiet)]">
          Foto analysieren, prüfen, dann bewusst übernehmen — nichts wird automatisch gespeichert.
        </p>
      </header>

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
            <p className="text-sm text-[color:var(--quiet)]">
              Standard für {person?.name}:{" "}
              {person ? defaultPlanTypeForPerson(person) === "school" ? "Stundenplan" : "Arbeitsplan" : "—"}
            </p>
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
            disabled={!file || step === "analyzing"}
            onClick={analyze}
          >
            {step === "analyzing" ? "Plan wird analysiert …" : "Plan analysieren"}
          </Button>
        </>
      ) : null}

      {step === "preview" && analysis ? (
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
              <p className="text-sm text-[color:var(--quiet)]">
                Es existiert bereits ein {planType === "school" ? "Stundenplan" : "Arbeitsplan"} für{" "}
                {person?.name}.
              </p>
            </section>
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
              variant="outline"
              size="lg"
              className="h-14 rounded-2xl px-6"
              onClick={() => {
                setAnalysis(null);
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
              onClick={clearFile}
            >
              Weiteren Plan
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
