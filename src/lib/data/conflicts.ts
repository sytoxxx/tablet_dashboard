import type { SchoolLesson, WeekdayKey, WorkShiftDay } from "@/lib/types";
import type { PlanDraft } from "@/lib/plan-analysis/types";
import { parseTimeToMinutes } from "@/lib/format";
import { WEEKDAY_ORDER } from "@/lib/format";
import { DAY_CONFIG } from "@/lib/day/config";

export type PlanConflict = {
  day: WeekdayKey;
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

export function detectWorkConflicts(
  existing: Partial<Record<WeekdayKey, WorkShiftDay>>,
  incoming: Partial<Record<WeekdayKey, WorkShiftDay>>,
): PlanConflict[] {
  const conflicts: PlanConflict[] = [];
  for (const day of WEEKDAY_ORDER) {
    const a = existing[day];
    const b = incoming[day];
    if (!a || !b) continue;
    const a0 = parseTimeToMinutes(a.start);
    const a1 = parseTimeToMinutes(a.end);
    const b0 = parseTimeToMinutes(b.start);
    const b1 = parseTimeToMinutes(b.end);
    if (overlaps(a0, a1, b0, b1)) {
      conflicts.push({
        day,
        existingLabel: `${a.start}–${a.end} ${a.label}`,
        incomingLabel: `${b.start}–${b.end} ${b.label}`,
        reason: "Schicht überschneidet sich",
      });
    }
  }
  return conflicts;
}

export function detectDraftConflicts(
  existingSchedule: { type: string; week: Record<string, unknown> },
  draft: PlanDraft,
): PlanConflict[] {
  if (draft.type === "school" && existingSchedule.type === "school") {
    return detectSchoolConflicts(
      existingSchedule.week as Partial<Record<WeekdayKey, { lessons: SchoolLesson[] }>>,
      draft.week,
    );
  }
  if (draft.type === "work" && existingSchedule.type === "work") {
    return detectWorkConflicts(
      existingSchedule.week as Partial<Record<WeekdayKey, WorkShiftDay>>,
      draft.week,
    );
  }
  return [];
}
