"use client";

import type { WeekdayKey } from "@/lib/types";
import type {
  AnalyzedSchoolLesson,
  AnalyzedWorkShift,
  PlanAnalysisResult,
  SchoolPlanDraft,
  WorkPlanDraft,
} from "@/lib/plan-analysis/types";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

      {result.uncertainties.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Unsichere Felder prüfen</p>
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

function WorkEditor({
  draft,
  uncertainPaths,
  onChange,
}: {
  draft: WorkPlanDraft;
  uncertainPaths: Set<string>;
  onChange: (d: WorkPlanDraft) => void;
}) {
  const setShift = (day: WeekdayKey, shift: AnalyzedWorkShift | null) => {
    const week = { ...draft.week };
    if (!shift) delete week[day];
    else week[day] = shift;
    onChange({ ...draft, week });
  };

  return (
    <div className="space-y-8">
      {WEEKDAY_ORDER.map((day) => {
        const shift = draft.week[day];
        const flagged =
          shift?.uncertain ||
          uncertainPaths.has(`week.${day}`) ||
          uncertainPaths.has(`week.${day}.location`);
        return (
          <section key={day} className="border-t border-[color:var(--hairline)] pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
                {WEEKDAY_LABELS[day]}
              </h3>
              {!shift ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() =>
                    setShift(day, {
                      label: "Schicht",
                      start: "06:30",
                      end: "14:30",
                      location: "",
                      uncertain: true,
                    })
                  }
                >
                  <Plus className="size-4" /> Schicht
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShift(day, null)}
                >
                  <Trash2 className="size-4" /> Entfernen
                </Button>
              )}
            </div>
            {!shift ? (
              <p className="text-[color:var(--quiet)]">Frei</p>
            ) : (
              <div
                className={cn(
                  "grid gap-2 rounded-2xl bg-[color:var(--surface)] p-3 sm:grid-cols-2",
                  flagged && "ring-2 ring-amber-400/60",
                )}
              >
                <input
                  value={shift.label}
                  onChange={(e) => setShift(day, { ...shift, label: e.target.value })}
                  className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)] sm:col-span-2"
                  aria-label="Bezeichnung"
                />
                <input
                  value={shift.start}
                  onChange={(e) => setShift(day, { ...shift, start: e.target.value })}
                  className="h-11 rounded-xl bg-white/70 px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                  aria-label="Beginn"
                />
                <input
                  value={shift.end}
                  onChange={(e) => setShift(day, { ...shift, end: e.target.value })}
                  className="h-11 rounded-xl bg-white/70 px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                  aria-label="Ende"
                />
                <input
                  value={shift.location}
                  onChange={(e) =>
                    setShift(day, {
                      ...shift,
                      location: e.target.value,
                      uncertain: e.target.value.trim() === "" || e.target.value === "?",
                    })
                  }
                  className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)] sm:col-span-2"
                  aria-label="Ort"
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
