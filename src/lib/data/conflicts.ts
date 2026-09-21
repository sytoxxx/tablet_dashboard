import type { SchoolLesson, WeekdayKey, WorkPlanEntry } from "@/lib/types";
import type { PlanDraft } from "@/lib/plan-analysis/types";
import { parseTimeToMinutes } from "@/lib/format";
import { WEEKDAY_ORDER } from "@/lib/format";
import { DAY_CONFIG } from "@/lib/day/config";

export type PlanConflict = {
  /** Weekday for school conflicts; the entry's own weekday for work conflicts (display only). */
  day: WeekdayKey;
  /** Real calendar date — set for dated work-plan conflicts, absent for school (weekday-recurring). */
  date?: string;
  existingLabel: string;
  incomingLabel: string;
  reason: string;
};

function lessonWindow(lesson: SchoolLesson): [number, number] {
  const start = parseTimeToMinutes(lesson.time);
  return [start, start + DAY_CONFIG.defaultBlockDurationMin];
}

function overlaps(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

export function detectSchoolConflicts(
  existing: Partial<Record<WeekdayKey, { lessons: SchoolLesson[] }>>,
  incoming: Partial<Record<WeekdayKey, { lessons: SchoolLesson[] }>>,
): PlanConflict[] {
  const conflicts: PlanConflict[] = [];
  for (const day of WEEKDAY_ORDER) {
    const left = existing[day]?.lessons ?? [];
    const right = incoming[day]?.lessons ?? [];
    for (const a of left) {
      const [a0, a1] = lessonWindow(a);
      for (const b of right) {
        const [b0, b1] = lessonWindow(b);
        if (overlaps(a0, a1, b0, b1)) {
          conflicts.push({
            day,
            existingLabel: `${a.time} ${a.subject}`,
            incomingLabel: `${b.time} ${b.subject}`,
            reason: "Zeitliche Überschneidung",
          });
        }
      }
    }
  }
  return conflicts;
}

function entryLabel(e: WorkPlanEntry): string {
  if (e.status !== "work") return e.label;
  return `${e.start}–${e.end} ${e.label}`;
}

/** ISO "YYYY-MM-DD" → the weekday it falls on, for display only. */
function weekdayOfIso(iso: string): WeekdayKey {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, m! - 1, d);
  return WEEKDAY_ORDER[(date.getDay() + 6) % 7]!;
}

/** A real calendar date present in both existing and incoming entries is a conflict — regardless of status. */
export function detectWorkEntryConflicts(
  existing: WorkPlanEntry[],
  incoming: WorkPlanEntry[],
): PlanConflict[] {
  const byDate = new Map(existing.map((e) => [e.date, e]));
  const conflicts: PlanConflict[] = [];
  for (const add of incoming) {
    const prev = byDate.get(add.date);
    if (!prev) continue;
    conflicts.push({
      day: weekdayOfIso(add.date),
      date: add.date,
      existingLabel: entryLabel(prev),
      incomingLabel: entryLabel(add),
      reason: "Für dieses Datum bereits ein Eintrag vorhanden",
    });
  }
  return conflicts;
}

export function detectDraftConflicts(
  existingSchedule: {
    type: string;
    week: Record<string, unknown>;
    entries?: WorkPlanEntry[];
  },
  draft: PlanDraft,
): PlanConflict[] {
  if (draft.type === "school" && existingSchedule.type === "school") {
    return detectSchoolConflicts(
      existingSchedule.week as Partial<Record<WeekdayKey, { lessons: SchoolLesson[] }>>,
      draft.week,
    );
  }
  if (draft.type === "work" && existingSchedule.type === "work") {
    return detectWorkEntryConflicts(existingSchedule.entries ?? [], draft.entries);
  }
  return [];
}
