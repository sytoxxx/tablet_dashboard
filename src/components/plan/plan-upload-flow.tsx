"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { pdfAllPagesToImageFiles } from "@/lib/plan-analysis/pdf-to-image";
import type { PersonId } from "@/lib/types";
import type { AnalyzedWorkEntry, PlanAnalysisMode, PlanAnalysisResult } from "@/lib/plan-analysis/types";
import {
  applyPlanDraft,
  defaultPlanTypeForPerson,
  personHasScheduleContent,
  type ApplyMode,
} from "@/lib/plan-analysis/apply";
import { revalidateWorkDraftForYear } from "@/lib/plan-analysis/revalidate";
import { assessReliability } from "@/lib/plan-analysis/reliability";
import { cn } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
/** A photo below this on its long edge almost never OCRs reliably — ask for a retake instead of guessing. */
const MIN_PHOTO_LONG_EDGE = 700;

type Step = "upload" | "converting" | "analyzing" | "clarify" | "preview" | "editor" | "saved";

function validateImageFile(file: File): string | null {
  if (file.size <= 0) return "Datei ist leer.";
  if (file.size > MAX_BYTES) return "Maximal 8 MB erlaubt.";
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (file.type && !file.type.startsWith("image/") && !isPdf) {
    return "Nur Bilddateien oder PDF sind erlaubt.";
  }
  return null;
}

/** Loads an image file just to read its pixel dimensions — a genuine too-small photo can't be read reliably. */
function readImageLongEdge(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(Math.max(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht gelesen werden."));
    };
    img.src = url;
  });
}

const STATUS_CHOICE_LABEL: Record<AnalyzedWorkEntry["status"], string> = {
  work: "Arbeit",
  free: "Frei",
  vacation: "Urlaub",
  sick: "Krankenstand",
  other: "Sonstiges",
};

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

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

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PlanAnalysisResult | null>(null);
  const [applyMode, setApplyMode] = useState<ApplyMode>("replace");
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  /** User's confirmed year when the recognized year had to be inferred (not read from the document). */
  const [yearConfirmed, setYearConfirmed] = useState(false);
  /** code -> chosen status, applied to every entry sharing that unresolved duty code. */
  const [codeAnswers, setCodeAnswers] = useState<Record<string, AnalyzedWorkEntry["status"]>>({});

  useEffect(() => {
    return () => {
      for (const url of previewUrls) URL.revokeObjectURL(url);
    };
  }, [previewUrls]);

  const hasExisting = useMemo(
    () => (person ? personHasScheduleContent(person, planType) : false),
    [person, planType],
  );

  const conflicts = useMemo(() => {
    if (!analysis || !person || applyMode === "replace") return [];
    return detectDraftConflicts(person.schedule, analysis.draft);
  }, [analysis, person, applyMode]);

  const yearNeedsConfirm =
    analysis?.mode === "work" &&
    analysis.period?.year != null &&
    !analysis.period.yearCertain &&
    !yearConfirmed;

  const unknownCodes = useMemo(() => {
    if (!analysis || analysis.mode !== "work") return [];
    return (analysis.unknownCodes ?? []).filter((code) => !(code in codeAnswers));
  }, [analysis, codeAnswers]);

  const needsClarification = Boolean(yearNeedsConfirm) || unknownCodes.length > 0;

  const unresolvedReviewCount = useMemo(() => {
    if (!analysis || analysis.draft.type !== "work") return 0;
    return analysis.draft.entries.filter((e) => e.uncertain && !e.reviewed).length;
  }, [analysis]);

  const onSelectPerson = (id: PersonId) => {
    setPersonId(id);
    const next = data.persons.find((p) => p.id === id);
    if (next) setPlanType(defaultPlanTypeForPerson(next));
  };

  const clearFile = () => {
    setPreviewUrls([]);
    setFiles([]);
    setAnalysis(null);
    setResolutions({});
    setYearConfirmed(false);
    setCodeAnswers({});
    setStep("upload");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const onFiles = async (list: FileList | null) => {
    const selected = list ? Array.from(list) : [];
    if (selected.length === 0) return;
    for (const f of selected) {
      const validationError = validateImageFile(f);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setAnalysis(null);
    setResolutions({});
    setYearConfirmed(false);
    setCodeAnswers({});
    setError(null);

    const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

    // A single PDF expands to all of its pages; several selected photos are
    // treated as consecutive pages of the same roster.
    if (selected.length === 1 && isPdf(selected[0]!)) {
      setStep("converting");
      try {
        const pages = await pdfAllPagesToImageFiles(selected[0]!);
        setFiles(pages);
        setPreviewUrls(pages.map((p) => URL.createObjectURL(p)));
        setStep("upload");
      } catch (e) {
        setError(
          e instanceof Error
            ? `PDF konnte nicht gelesen werden: ${e.message}`
            : "PDF konnte nicht gelesen werden.",
        );
        setStep("upload");
      }
      return;
    }

    if (selected.some(isPdf)) {
      setError("Bitte entweder ein PDF oder mehrere Fotos auswählen, nicht gemischt.");
      return;
    }

    // Quality gate: a photo too small on its long edge can't be read reliably — ask for a retake now.
    try {
      for (const f of selected) {
        const longEdge = await readImageLongEdge(f);
        if (longEdge < MIN_PHOTO_LONG_EDGE) {
          setError(
            "Das Bild ist nicht eindeutig genug. Bitte fotografiere den Dienstplan noch einmal vollständig und möglichst gerade, mit gutem Licht.",
          );
          return;
        }
      }
    } catch {
      // If dimension probing itself fails, fall through — the AI's own
      // legibility warnings still apply; we never block on this alone.
    }

    setFiles(selected);
    setPreviewUrls(selected.map((f) => URL.createObjectURL(f)));
    setStep("upload");
  };

  const analyze = async () => {
    if (files.length === 0 || !person) return;
    if (!online) {
      setError("Offline – KI-Analyse ist nicht verfügbar. Gespeicherte Pläne bleiben nutzbar.");
      return;
    }
    setError(null);
    setStep("analyzing");
    try {
      const body = new FormData();
      for (const f of files) body.append("file", f);
      body.append("personId", person.id);
      body.append("planType", planType);
      body.append("personName", person.name);
      const res = await fetch("/api/plan/analyze", { method: "POST", body });
      const json = (await res.json()) as PlanAnalysisResult & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Analyse fehlgeschlagen.");
      }

      const reliability = assessReliability(json);
      if (!reliability.reliable) {
        // Never let a genuinely unreadable photo proceed — ask for a retake
        // instead of showing a preview built on guesses. This looks at the
        // overall pattern of unreadable entries, never a single low
        // confidence number alone.
        setFiles([]);
        setPreviewUrls([]);
        if (fileRef.current) fileRef.current.value = "";
        if (cameraRef.current) cameraRef.current.value = "";
        setAnalysis(null);
        setError(reliability.reason);
        setStep("upload");
        return;
      }

      setAnalysis(json);
      setApplyMode(hasExisting ? "merge" : "replace");
      setResolutions({});
      setYearConfirmed(false);
      setCodeAnswers({});
      const stillNeedsClarification =
        json.mode === "work" &&
        ((json.period?.year != null && !json.period.yearCertain) ||
          (json.unknownCodes?.length ?? 0) > 0);
      setStep(stillNeedsClarification ? "clarify" : "preview");
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

  const applyCodeAnswer = (code: string, status: AnalyzedWorkEntry["status"]) => {
    setCodeAnswers((prev) => ({ ...prev, [code]: status }));
    setAnalysis((prev) => {
      if (!prev || prev.draft.type !== "work") return prev;
      const label = STATUS_CHOICE_LABEL[status];
      return {
        ...prev,
        draft: {
          ...prev.draft,
          entries: prev.draft.entries.map((e) =>
            e.code === code
              ? {
                  ...e,
                  status,
                  label: status === "work" ? `Schicht (${code})` : label,
                  start: "",
                  end: "",
                  timeUnclear: status === "work",
                  unresolvedCode: false,
                  uncertain: status === "work",
                }
              : e,
          ),
        },
      };
    });
  };

  const applyYearChoice = (year: number) => {
    setYearConfirmed(true);
    setAnalysis((prev) => {
      if (!prev || prev.draft.type !== "work" || !prev.period) return prev;
      // Full re-validation, not a bare date patch: a year change can flip
      // weekday-match results and which entries fall inside the recognized
      // period, so those must be recomputed fresh — never carried over from
      // the (now superseded) old-year plausibility pass.
      const { entries, period, uncertainties } = revalidateWorkDraftForYear(
        prev.draft.entries,
        year,
      );
      const modelNotes = prev.uncertainties.filter((u) => !u.path.startsWith("entries."));
      return {
        ...prev,
        period,
        uncertainties: [...modelNotes, ...uncertainties],
        draft: { ...prev.draft, entries },
      };
    });
  };

  const proceedToPreview = () => {
    if (needsClarification) return;
    setStep("preview");
  };

  const confirmSave = () => {
    if (!analysis || !person) return;
    if (unresolvedReviewCount > 0) {
      setError(
        `Es sind noch ${unresolvedReviewCount} unsichere Einträge offen — bitte erst prüfen (⚠️-markiert), dann übernehmen.`,
      );
      return;
    }
    if (
      analysis.draft.type === "work" &&
      analysis.draft.entries.some((e) => e.status === "work" && (!e.start || !e.end))
    ) {
      setError("Bitte fehlende Zeiten ergänzen, bevor der Plan übernommen wird.");
      return;
    }
    setError(null);
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
            Foto oder PDF → Analyse → Draft → Bearbeiten → Konflikte → Speichern. Nichts wird
            automatisch ersetzt.
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

      {step === "upload" || step === "analyzing" || step === "converting" ? (
        <>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="h-14 gap-2 rounded-2xl px-5 active:scale-[0.97]"
              onClick={() => fileRef.current?.click()}
              disabled={step === "analyzing" || step === "converting"}
            >
              <ImagePlus className="size-5" aria-hidden />
              Bild oder PDF auswählen
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 gap-2 rounded-2xl bg-[color:var(--surface)] px-5 active:scale-[0.97]"
              onClick={() => cameraRef.current?.click()}
              disabled={step === "analyzing" || step === "converting"}
            >
              <Camera className="size-5" aria-hidden />
              Foto aufnehmen
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>

          {step === "converting" ? (
            <p role="status" className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-[color:var(--quiet)]">
              PDF wird gelesen …
            </p>
          ) : previewUrls.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm text-[color:var(--quiet)]">
                  {files.length === 1
                    ? files[0]?.name
                    : `${files.length} Seiten ausgewählt`}
                </p>
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
              {previewUrls.length === 1 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrls[0]}
                  alt="Vorschau des Plans"
                  className="max-h-[45vh] w-full rounded-[1.5rem] object-contain bg-[color:var(--surface)]"
                />
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {previewUrls.map((url, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt={`Seite ${index + 1}`}
                      className="h-40 w-auto shrink-0 rounded-2xl object-contain bg-[color:var(--surface)]"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[1.5rem] bg-[color:var(--surface)] px-6 py-16 text-center text-[color:var(--quiet)]">
              Noch kein Bild — auswählen oder Kamera nutzen. Mehrere Fotos oder ein mehrseitiges
              PDF werden als zusammenhängender Plan gelesen.
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
            disabled={files.length === 0 || step === "analyzing" || step === "converting" || !online}
            onClick={analyze}
          >
            {step === "analyzing" ? "Plan wird analysiert …" : "Plan analysieren"}
          </Button>
        </>
      ) : null}

      {step === "clarify" && analysis ? (
        <div className="space-y-6">
          <h2 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
            Kurze Rückfrage, bevor die Vorschau erscheint
          </h2>

          {yearNeedsConfirm && analysis.period?.year != null ? (
            <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-50/50 px-4 py-4">
              <p className="text-sm font-medium text-amber-950">
                Ich kann das Jahr des Dienstplans nicht eindeutig erkennen. Ich nehme an:{" "}
                {analysis.period.year}. Stimmt das?
              </p>
              <div className="flex flex-wrap gap-2">
                {[analysis.period.year - 1, analysis.period.year, analysis.period.year + 1].map(
                  (y) => (
                    <Button
                      key={y}
                      type="button"
                      variant={y === analysis.period!.year ? "default" : "outline"}
                      onClick={() => applyYearChoice(y)}
                    >
                      {y}
                    </Button>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {unknownCodes.map((code) => (
            <div key={code} className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-50/50 px-4 py-4">
              <p className="text-sm font-medium text-amber-950">
                Ich habe den Code „{code}“ gefunden, kann ihn aber nicht eindeutig zuordnen. Was
                bedeutet {code}?
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_CHOICE_LABEL) as AnalyzedWorkEntry["status"][]).map(
                  (status) => (
                    <Button
                      key={status}
                      type="button"
                      variant="outline"
                      onClick={() => applyCodeAnswer(code, status)}
                    >
                      {STATUS_CHOICE_LABEL[status]}
                    </Button>
                  ),
                )}
              </div>
            </div>
          ))}

          <Button
            type="button"
            size="lg"
            className="h-14 rounded-2xl px-6 active:scale-[0.97]"
            disabled={needsClarification}
            onClick={proceedToPreview}
          >
            Weiter zur Vorschau
          </Button>
        </div>
      ) : null}

      {(step === "preview" || step === "editor") && analysis ? (
        <div className="space-y-8">
          <PlanPreviewEditor result={analysis} onChange={setAnalysis} />

          {hasExisting ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
                Speichern
              </h2>
              {analysis.mode === "work" && analysis.period?.month && analysis.period.year ? (
                <p className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--quiet)]">
                  Für {MONTH_NAMES[analysis.period.month - 1]} {analysis.period.year} existieren
                  bereits Daten. Der neue Plan enthält Daten für denselben oder einen
                  überlappenden Zeitraum — Ersetzen tauscht diesen Zeitraum komplett aus,
                  Ergänzen vergleicht Tag für Tag und zeigt Konflikte einzeln an.
                </p>
              ) : null}
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

          {unresolvedReviewCount > 0 ? (
            <p className="rounded-2xl border border-amber-500/30 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
              ⚠️ Noch {unresolvedReviewCount} unsichere{" "}
              {unresolvedReviewCount === 1 ? "Eintrag" : "Einträge"} zu prüfen, bevor der Plan
              übernommen werden kann — unten mit „✓ geprüft“ bestätigen oder korrigieren.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="h-14 rounded-2xl px-6 active:scale-[0.97]"
              disabled={unresolvedReviewCount > 0}
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
                setYearConfirmed(false);
                setCodeAnswers({});
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
