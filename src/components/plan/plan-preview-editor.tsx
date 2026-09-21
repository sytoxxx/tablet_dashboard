"use client";

import type { WeekdayKey, WorkDayStatus } from "@/lib/types";
import type {
  AnalyzedSchoolLesson,
  AnalyzedWorkEntry,
  PlanAnalysisResult,
  SchoolPlanDraft,
  WorkPlanDraft,
} from "@/lib/plan-analysis/types";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/format";
import { toIsoDate } from "@/lib/day/tomorrow";
import { Button } from "@/components/ui/button";
import { Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

type PlanPreviewEditorProps = {
  result: PlanAnalysisResult;
  onChange: (next: PlanAnalysisResult) => void;
};

export function PlanPreviewEditor({ result, onChange }: PlanPreviewEditorProps) {
  const uncertainPaths = new Set(result.uncertainties.map((u) => u.path));

  const updateDraft = (draft: PlanAnalysisResult["draft"]) => {
    onChange({ ...result, draft });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--quiet)]">
        <span>
          Quelle: {result.source === "ai" ? "KI" : "Mock"} · Konfidenz{" "}
          {Math.round(result.confidence * 100)}%
        </span>
        {result.warnings.map((w) => (
          <span key={w} className="rounded-full bg-[color:var(--surface)] px-3 py-1">
            {w}
          </span>
        ))}
      </div>

      {result.mode === "work" && result.period?.month && result.period.year ? (
        <p className="text-sm font-semibold tracking-[0.1em] text-[color:var(--quiet)] uppercase">
          {MONTH_NAMES[result.period.month - 1]} {result.period.year}
          {!result.period.monthCertain ? " (mehrere Monate)" : ""}
        </p>
      ) : null}

      {result.legend && Object.keys(result.legend).length > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs text-[color:var(--quiet)]">
          <span className="font-medium">Legende erkannt:</span>
          {Object.entries(result.legend).map(([code, meaning]) => (
            <span key={code} className="rounded-full bg-[color:var(--surface)] px-3 py-1">
              {code} = {meaning}
            </span>
          ))}
        </div>
      ) : null}

      {result.uncertainties.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">⚠️ Unsichere Felder prüfen</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {result.uncertainties.map((u) => (
              <li key={`${u.path}-${u.reason}`}>
                <code className="text-xs">{u.path}</code> — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.draft.type === "school" ? (
        <SchoolEditor
          draft={result.draft}
          uncertainPaths={uncertainPaths}
          onChange={(draft) => updateDraft(draft)}
        />
      ) : (
        <WorkEditor
          draft={result.draft}
          uncertainPaths={uncertainPaths}
          onChange={(draft) => updateDraft(draft)}
        />
      )}
    </div>
  );
}

function SchoolEditor({
  draft,
  uncertainPaths,
  onChange,
}: {
  draft: SchoolPlanDraft;
  uncertainPaths: Set<string>;
  onChange: (d: SchoolPlanDraft) => void;
}) {
  const setDayLessons = (day: WeekdayKey, lessons: AnalyzedSchoolLesson[]) => {
    onChange({
      ...draft,
      week: {
        ...draft.week,
        [day]: { lessons },
      },
    });
  };

  return (
    <div className="space-y-8">
      {WEEKDAY_ORDER.map((day) => {
        const lessons = draft.week[day]?.lessons ?? [];
        return (
          <section key={day} className="border-t border-[color:var(--hairline)] pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
                {WEEKDAY_LABELS[day]}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() =>
                  setDayLessons(day, [
                    ...lessons,
                    {
                      id: `new-${day}-${lessons.length}`,
                      time: "08:00",
                      subject: "Neues Fach",
                      room: "",
                      uncertain: true,
                    },
                  ])
                }
              >
                <Plus className="size-4" /> Stunde
              </Button>
            </div>
            {lessons.length === 0 ? (
              <p className="text-[color:var(--quiet)]">Keine Stunden</p>
            ) : (
              <ul className="space-y-3">
                {lessons.map((lesson, index) => {
                  const flagged =
                    lesson.uncertain ||
                    uncertainPaths.has(`week.${day}.lessons.${index}`) ||
                    uncertainPaths.has(`week.${day}.lessons.${index}.room`);
                  return (
                    <li
                      key={lesson.id}
                      className={cn(
                        "grid gap-2 rounded-2xl bg-[color:var(--surface)] p-3 sm:grid-cols-[6rem_1fr_6rem_auto]",
                        flagged && "ring-2 ring-amber-400/60",
                      )}
                    >
                      <input
                        value={lesson.time}
                        onChange={(e) => {
                          const next = [...lessons];
                          next[index] = { ...lesson, time: e.target.value };
                          setDayLessons(day, next);
                        }}
                        className="h-11 rounded-xl bg-white/70 px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                        aria-label="Uhrzeit"
                      />
                      <input
                        value={lesson.subject}
                        onChange={(e) => {
                          const next = [...lessons];
                          next[index] = { ...lesson, subject: e.target.value };
                          setDayLessons(day, next);
                        }}
                        className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                        aria-label="Fach"
                      />
                      <input
                        value={lesson.room}
                        onChange={(e) => {
                          const next = [...lessons];
                          next[index] = {
                            ...lesson,
                            room: e.target.value,
                            uncertain: e.target.value.trim() === "" || e.target.value === "?",
                          };
                          setDayLessons(day, next);
                        }}
                        className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                        aria-label="Raum"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Stunde löschen"
                        onClick={() => setDayLessons(day, lessons.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

const STATUS_OPTIONS: Array<{ value: WorkDayStatus; label: string }> = [
  { value: "work", label: "Arbeit" },
  { value: "free", label: "Frei" },
  { value: "vacation", label: "Urlaub" },
  { value: "sick", label: "Krankenstand" },
  { value: "other", label: "Sonstiges" },
];

const NON_WORK_DEFAULT_LABEL: Record<Exclude<WorkDayStatus, "work">, string> = {
  free: "Frei",
  vacation: "Urlaub",
  sick: "Krankenstand",
  other: "Sonstiges",
};

/** ISO "YYYY-MM-DD" → the weekday it actually falls on. */
function weekdayKeyOfIso(iso: string): WeekdayKey {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, m! - 1, d);
  return WEEKDAY_ORDER[(date.getDay() + 6) % 7]!;
}

function formatIsoDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function isoPlusOneDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, m! - 1, d! + 1);
  return toIsoDate(date);
}

/**
 * Dated, chronological list — mirrors what a real monthly roster looks like
 * (any number of weeks, any month/year), not a fixed Mon–Sun grid.
 */
function WorkEditor({
  draft,
  uncertainPaths,
  onChange,
}: {
  draft: WorkPlanDraft;
  uncertainPaths: Set<string>;
  onChange: (d: WorkPlanDraft) => void;
}) {
  const sortEntries = (entries: AnalyzedWorkEntry[]) =>
    [...entries].sort((a, b) => a.date.localeCompare(b.date));

  const setEntry = (index: number, entry: AnalyzedWorkEntry | null) => {
    const entries = [...draft.entries];
    // Any deliberate field edit counts as the user having looked at this row.
    if (!entry) entries.splice(index, 1);
    else entries[index] = { ...entry, reviewed: true };
    onChange({ ...draft, entries: sortEntries(entries) });
  };

  const toggleReviewed = (index: number) => {
    const entries = [...draft.entries];
    const entry = entries[index]!;
    entries[index] = { ...entry, reviewed: !entry.reviewed };
    onChange({ ...draft, entries });
  };

  const setStatus = (index: number, status: WorkDayStatus) => {
    const current = draft.entries[index]!;
    if (status === "work") {
      setEntry(index, {
        ...current,
        label: current.status === "work" ? current.label : "Schicht",
        start: current.status === "work" ? current.start : "06:30",
        end: current.status === "work" ? current.end : "14:30",
        location: current.status === "work" ? current.location : "",
        status: "work",
      });
      return;
    }
    setEntry(index, {
      ...current,
      label: NON_WORK_DEFAULT_LABEL[status],
      start: "",
      end: "",
      location: "",
      status,
    });
  };

  const addEntry = () => {
    const last = draft.entries[draft.entries.length - 1];
    const date = last ? isoPlusOneDay(last.date) : toIsoDate(new Date());
    onChange({
      ...draft,
      entries: sortEntries([
        ...draft.entries,
        { date, label: "Schicht", start: "06:30", end: "14:30", location: "", status: "work", uncertain: true },
      ]),
    });
  };

  return (
    <div className="space-y-8">
      {draft.entries.length === 0 ? (
        <p className="text-[color:var(--quiet)]">Keine Einträge</p>
      ) : (
        draft.entries.map((entry, index) => {
          const flagged =
            entry.uncertain ||
            uncertainPaths.has(`entries.${index}`) ||
            uncertainPaths.has(`entries.${index}.location`) ||
            uncertainPaths.has(`entries.${index}.date`);
          const actualWeekday = weekdayKeyOfIso(entry.date);
          const weekdayMismatch = entry.weekday && entry.weekday !== actualWeekday;

          return (
            <section
              key={`${entry.date}-${index}`}
              className="border-t border-[color:var(--hairline)] pt-5"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
                    {flagged && !entry.reviewed ? "⚠️ " : ""}
                    {WEEKDAY_LABELS[actualWeekday]}
                  </h3>
                  {weekdayMismatch ? (
                    <p className="text-xs text-amber-700">
                      Plan zeigt {WEEKDAY_LABELS[entry.weekday!]} — bitte Datum prüfen
                    </p>
                  ) : null}
                </div>
                <input
                  type="date"
                  value={entry.date}
                  onChange={(e) => setEntry(index, { ...entry, date: e.target.value })}
                  className="h-11 rounded-xl bg-[color:var(--surface)] px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                  aria-label={`Datum (${formatIsoDisplay(entry.date)})`}
                />
                {flagged ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={entry.reviewed ? "default" : "outline"}
                    className="gap-1"
                    onClick={() => toggleReviewed(index)}
                  >
                    <Check className="size-4" /> {entry.reviewed ? "geprüft" : "✓ geprüft"}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEntry(index, null)}
                >
                  <Trash2 className="size-4" /> Entfernen
                </Button>
              </div>

              <div
                className="mb-3 flex flex-wrap gap-2"
                role="group"
                aria-label={`Status ${formatIsoDisplay(entry.date)}`}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(index, opt.value)}
                    className={cn(
                      "min-h-10 rounded-xl px-3 text-sm transition-transform active:scale-[0.97]",
                      entry.status === opt.value
                        ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                        : "bg-[color:var(--surface)]",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {entry.status !== "work" ? (
                <div
                  className={cn(
                    "rounded-2xl bg-[color:var(--surface)] p-3",
                    flagged && "ring-2 ring-amber-400/60",
                  )}
                >
                  <input
                    value={entry.label}
                    onChange={(e) => setEntry(index, { ...entry, label: e.target.value })}
                    className="h-11 w-full rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                    aria-label="Bezeichnung"
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    "grid gap-2 rounded-2xl bg-[color:var(--surface)] p-3 sm:grid-cols-2",
                    flagged && "ring-2 ring-amber-400/60",
                  )}
                >
                  <input
                    value={entry.label}
                    onChange={(e) => setEntry(index, { ...entry, label: e.target.value })}
                    className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)] sm:col-span-2"
                    aria-label="Bezeichnung"
                  />
                  <input
                    value={entry.start}
                    onChange={(e) => setEntry(index, { ...entry, start: e.target.value })}
                    className="h-11 rounded-xl bg-white/70 px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                    aria-label="Beginn"
                  />
                  <input
                    value={entry.end}
                    onChange={(e) => setEntry(index, { ...entry, end: e.target.value })}
                    className="h-11 rounded-xl bg-white/70 px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                    aria-label="Ende"
                  />
                  <input
                    value={entry.location}
                    onChange={(e) => setEntry(index, { ...entry, location: e.target.value })}
                    className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)] sm:col-span-2"
                    aria-label="Ort"
                  />
                </div>
              )}
            </section>
          );
        })
      )}
      <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={addEntry}>
        <Plus className="size-4" /> Tag hinzufügen
      </Button>
    </div>
  );
}
