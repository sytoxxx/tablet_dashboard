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
import { conflictKey, type ConflictResolution } from "@/lib/data/conflict-resolution";
import {
  compareWorkEntries,
  detectDraftConflicts,
  detectWorkEntryConflicts,
} from "@/lib/data/conflicts";
import { PlanTextImport } from "@/components/plan/plan-text-import";
import { isUnclearEntry } from "@/lib/plan-analysis/text-import";
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
import { checkPhotoFile } from "@/lib/plan-analysis/photo-quality-client";
import { withoutDemoTimetable } from "@/lib/school/demo-timetable";
import {
  PHOTO_PROBLEM_TEXT,
  PHOTO_TIPS,
  type PhotoProblem,
} from "@/lib/plan-analysis/photo-quality";
import { cn } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
type Step = "upload" | "converting" | "analyzing" | "choose-row" | "clarify" | "preview" | "editor" | "saved";

/** Why the photo cannot be used + what to do — shown instead of a plan, never a guess. */
type Retake = { headline: string; problems: string[]; tips: string[] };

const ROW_LABEL_KEY = (personId: string) => `coffee-morning-plan-row-label:${personId}`;

function readRememberedRow(personId: string): string | undefined {
  try {
    return window.localStorage.getItem(ROW_LABEL_KEY(personId)) || undefined;
  } catch {
    return undefined;
  }
}

function validateImageFile(file: File): string | null {
  if (file.size <= 0) return "Datei ist leer.";
  if (file.size > MAX_BYTES) return "Maximal 8 MB erlaubt.";
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (file.type && !file.type.startsWith("image/") && !isPdf) {
    return "Nur Bilddateien oder PDF sind erlaubt.";
  }
  return null;
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
  // The shipped example timetable is not "existing data" — a scan must not be merged into it.
  const storedPerson = data.persons.find((p) => p.id === personId) ?? data.persons[0];
  const person = storedPerson ? withoutDemoTimetable(storedPerson) : storedPerson;

  const [planType, setPlanType] = useState<PlanAnalysisMode>(() =>
    person ? defaultPlanTypeForPerson(person) : "school",
  );

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  /** Work plans can be imported from a ChatGPT list (default) or read from a photo/PDF. */
  const [importSource, setImportSource] = useState<"text" | "photo">("text");
  const [pastedText, setPastedText] = useState("");
  /** Text import needs an explicit person — the default "levi" must never be taken for granted. */
  const [personChosen, setPersonChosen] = useState(Boolean(initialPersonId));
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [retake, setRetake] = useState<Retake | null>(null);
  const [rowChoices, setRowChoices] = useState<string[]>([]);
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

  const isTextResult = analysis?.source === "text";

  /** Text import: compare date by date — only days whose content really differs need a decision. */
  const textComparison = useMemo(() => {
    if (!analysis || !person || analysis.source !== "text" || analysis.draft.type !== "work") return null;
    const existing = person.schedule.type === "work" ? (person.schedule.entries ?? []) : [];
    const { added, unchanged, changed } = compareWorkEntries(existing, analysis.draft.entries);
    return { added, unchanged, changed, conflicts: detectWorkEntryConflicts(existing, changed) };
  }, [analysis, person]);

  const conflicts = useMemo(() => {
    if (textComparison) return textComparison.conflicts;
    if (!analysis || !person || applyMode === "replace") return [];
    return detectDraftConflicts(person.schedule, analysis.draft);
  }, [analysis, person, applyMode, textComparison]);

  const undecidedConflicts = isTextResult
    ? conflicts.filter((c) => !(conflictKey(c) in resolutions)).length
    : 0;

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
    if (!analysis) return 0;
    if (analysis.draft.type === "school") {
      return Object.values(analysis.draft.week).reduce(
        (sum, day) => sum + (day?.lessons.filter((l) => l.uncertain).length ?? 0),
        0,
      );
    }
    return analysis.draft.entries.filter((e) => e.uncertain && !e.reviewed).length;
  }, [analysis]);

  const onSelectPerson = (id: PersonId) => {
    setPersonId(id);
    setPersonChosen(true);
    const next = data.persons.find((p) => p.id === id);
    if (next) setPlanType(defaultPlanTypeForPerson(next));
  };

  const resetFiles = () => {
    setFiles([]);
    setPreviewUrls([]);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const clearFile = () => {
    setRetake(null);
    setRowChoices([]);
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
    setRetake(null);

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

    // Quality gate: measure resolution, sharpness, light and reflections BEFORE
    // any upload. A bad scan is rejected here — it is better to retake the
    // photo than to save a wrong plan.
    const problems = new Set<PhotoProblem>();
    for (const f of selected) {
      const check = await checkPhotoFile(f);
      if (check.status === "rejected") check.problems.forEach((p) => problems.add(p));
    }
    if (problems.size > 0) {
      setFiles([]);
      setPreviewUrls([]);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
      setRetake({
        headline: "Das Foto ist leider nicht gut genug lesbar.",
        problems: [...problems].map((p) => PHOTO_PROBLEM_TEXT[p]),
        tips: PHOTO_TIPS,
      });
      return;
    }

    setFiles(selected);
    setPreviewUrls(selected.map((f) => URL.createObjectURL(f)));
    setStep("upload");
  };

  const analyze = async (chosenRow?: string) => {
    if (files.length === 0 || !person) return;
    if (!online) {
      setError("Offline – KI-Analyse ist nicht verfügbar. Gespeicherte Pläne bleiben nutzbar.");
      return;
    }
    setError(null);
    setRetake(null);
    setStep("analyzing");
    try {
      const body = new FormData();
      for (const f of files) body.append("file", f);
      body.append("personId", person.id);
      body.append("planType", planType);
      body.append("personName", person.name);
      if (chosenRow) body.append("rowLabel", chosenRow);
      else {
        const remembered = readRememberedRow(person.id);
        if (remembered) body.append("rowHint", remembered);
      }
      const res = await fetch("/api/plan/analyze", { method: "POST", body });
      const json = (await res.json()) as PlanAnalysisResult & {
        error?: string;
        code?: string;
        tips?: string[];
        rows?: string[];
        issues?: string[];
      };
      if (!res.ok) {
        if (json.code === "photo_unreadable") {
          resetFiles();
          setRetake({
            headline: json.error || "Das Foto ist leider nicht gut genug lesbar.",
            problems: [],
            tips: json.tips?.length ? json.tips : PHOTO_TIPS,
          });
          setStep("upload");
          return;
        }
        if (json.code === "needs_row_choice" && json.rows?.length) {
          setRowChoices(json.rows);
          setStep("choose-row");
          return;
        }
        throw new Error(json.error || "Analyse fehlgeschlagen.");
      }

      const reliability = assessReliability(json);
      if (!reliability.reliable) {
        // Never let a genuinely unreadable photo proceed — ask for a retake
        // instead of showing a preview built on guesses. This looks at the
        // overall pattern of unreadable entries, never a single low
        // confidence number alone.
        resetFiles();
        setAnalysis(null);
        setRetake({
          headline: "Das Foto ist leider nicht gut genug lesbar.",
          problems: [reliability.reason],
          tips: PHOTO_TIPS,
        });
        setStep("upload");
        return;
      }

      if (chosenRow) {
        try {
          window.localStorage.setItem(ROW_LABEL_KEY(person.id), chosenRow);
        } catch {
          /* remembering the row is only a convenience */
        }
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
    if (analysis.draft.type === "work") {
      const seen = new Set<string>();
      for (const e of analysis.draft.entries) {
        if (seen.has(e.date)) {
          setError(
            `Der ${e.date.slice(8, 10)}.${e.date.slice(5, 7)}.${e.date.slice(0, 4)} kommt mehrfach vor — bitte einen der Einträge entfernen.`,
          );
          return;
        }
        seen.add(e.date);
      }
      const unclear = analysis.draft.entries.filter(isUnclearEntry);
      if (unclear.length > 0) {
        setError(
          `${unclear.length === 1 ? "Ein Tag ist" : `${unclear.length} Tage sind`} noch „Unklar“ — bitte Status wählen (Arbeit, Frei, Urlaub, Krankenstand) oder den Tag entfernen.`,
        );
        return;
      }
    }
    if (undecidedConflicts > 0) {
      setError(
        `Für ${undecidedConflicts} ${undecidedConflicts === 1 ? "Tag gibt es" : "Tage gibt es"} schon einen anderen Eintrag — bitte jeweils „Behalten“ oder „Übernehmen“ wählen.`,
      );
      return;
    }
    setError(null);
    updatePerson(person.id, (p) =>
      applyPlanDraft(withoutDemoTimetable(p), analysis.draft, isTextResult ? "merge" : applyMode, {
        conflicts,
        resolutions,
      }),
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
          {planType === "work" ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
                Wie möchtest du den Plan eingeben?
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["text", "Mit ChatGPT importieren", "Empfohlen — ChatGPT liest den Plan, du fügst die Liste ein."],
                    ["photo", "Foto oder PDF", "Die Website versucht, den Plan selbst zu lesen."],
                  ] as const
                ).map(([id, title, hint]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setImportSource(id)}
                    aria-pressed={importSource === id}
                    className={cn(
                      "flex min-h-20 flex-col items-start justify-center gap-1 rounded-2xl px-5 py-4 text-left transition-transform active:scale-[0.98]",
                      importSource === id
                        ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                        : "bg-[color:var(--surface)]",
                    )}
                  >
                    <span className="text-lg font-medium">{title}</span>
                    <span className={cn("text-sm", importSource === id ? "opacity-80" : "text-[color:var(--quiet)]")}>{hint}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {planType === "work" && importSource === "text" ? (
            personChosen && person && person.id !== "levi" ? (
              <PlanTextImport
                persons={data.persons.filter((p) => p.id !== "levi").map((p) => ({ id: p.id, name: p.name }))}
                chosenPersonId={personId}
                text={pastedText}
                onTextChange={setPastedText}
                onReady={(result, id) => {
                  setPersonId(id);
                  setPersonChosen(true);
                  setAnalysis(result);
                  setApplyMode("merge");
                  setResolutions({});
                  setYearConfirmed(false);
                  setCodeAnswers({});
                  setError(null);
                  const needsAsk =
                    (result.period?.year != null && !result.period.yearCertain) ||
                    (result.unknownCodes?.length ?? 0) > 0;
                  setStep(needsAsk ? "clarify" : "preview");
                }}
              />
            ) : (
              <p className="rounded-2xl bg-[color:var(--surface)] px-5 py-5 text-lg">
                Für wen ist der Arbeitsplan? Oben <strong>Birgit</strong> oder <strong>Heidi</strong> wählen.
              </p>
            )
          ) : (
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

          {retake ? (
            <div
              role="alert"
              data-testid="photo-retake"
              className="space-y-4 rounded-[1.5rem] border border-amber-500/30 bg-amber-50/60 px-5 py-5 text-amber-950"
            >
              <p className="font-display text-2xl tracking-tight">{retake.headline}</p>
              {retake.problems.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-base">
                  {retake.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : null}
              <div className="space-y-2">
                <p className="text-sm font-semibold tracking-[0.14em] uppercase">So klappt es</p>
                <ul className="list-disc space-y-1 pl-5 text-base">
                  {retake.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
              <Button
                type="button"
                size="lg"
                className="h-14 gap-2 rounded-2xl px-6 active:scale-[0.97]"
                onClick={() => {
                  setRetake(null);
                  cameraRef.current?.click();
                }}
              >
                <Camera className="size-5" aria-hidden />
                Neu fotografieren
              </Button>
            </div>
          ) : null}

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
            onClick={() => analyze()}
          >
            {step === "analyzing" ? "Plan wird analysiert …" : "Plan analysieren"}
          </Button>
            </>
          )}
        </>
      ) : null}

      {step === "choose-row" ? (
        <div className="space-y-5" data-testid="choose-row">
          <h2 className="font-display text-3xl tracking-tight">Welche Zeile ist deine?</h2>
          <p className="text-lg text-[color:var(--quiet)]">
            Auf dem Plan stehen mehrere Personen. Ich bin nicht sicher, welche Zeile zu{" "}
            {person?.name} gehört — bitte wähle sie aus. Ohne deine Wahl lese ich nichts aus.
          </p>
          <div className="flex flex-wrap gap-3">
            {rowChoices.map((label) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                size="lg"
                className="h-14 rounded-2xl px-6 text-base active:scale-[0.97]"
                onClick={() => analyze(label)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 rounded-2xl"
            onClick={clearFile}
          >
            Anderes Foto wählen
          </Button>
        </div>
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

          {isTextResult && textComparison ? (
            <section className="space-y-3" data-testid="text-compare">
              <h2 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
                Vergleich mit dem gespeicherten Plan von {person?.name}
              </h2>
              <p className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-base">
                <strong>{textComparison.added.length}</strong> {textComparison.added.length === 1 ? "Tag ist" : "Tage sind"} neu
                {textComparison.unchanged.length > 0 ? (
                  <> · <strong>{textComparison.unchanged.length}</strong> unverändert</>
                ) : null}
                {textComparison.changed.length > 0 ? (
                  <> · <strong>{textComparison.changed.length}</strong> {textComparison.changed.length === 1 ? "Tag ändert" : "Tage ändern"} einen bestehenden Eintrag</>
                ) : null}
                . Andere Monate und Tage, die nicht in der Liste stehen, bleiben unberührt.
              </p>
            </section>
          ) : null}

          {hasExisting && !isTextResult ? (
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

          {applyMode === "merge" || isTextResult ? (
            <PlanConflictResolver
              conflicts={conflicts}
              resolutions={resolutions}
              requireChoice={isTextResult}
              onChangeAll={(value) =>
                setResolutions(Object.fromEntries(conflicts.map((c) => [conflictKey(c), value])))
              }
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
              disabled={unresolvedReviewCount > 0 || undecidedConflicts > 0}
              onClick={confirmSave}
            >
              ✓ {analysis.mode === "work" ? "Arbeitsplan" : "Stundenplan"} speichern
            </Button>
            {isTextResult ? (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="h-14 rounded-2xl bg-[color:var(--surface)] px-6"
                onClick={() => {
                  setAnalysis(null);
                  setResolutions({});
                  setYearConfirmed(false);
                  setCodeAnswers({});
                  setError(null);
                  setStep("upload");
                }}
              >
                Zurück zur Liste
              </Button>
            ) : null}
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
