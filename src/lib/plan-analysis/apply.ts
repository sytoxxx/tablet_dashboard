import type {
  PersonProfile,
  Schedule,
  SchoolDay,
  SchoolLesson,
  WeekdayKey,
  WorkShiftDay,
} from "@/lib/types";
import type { PlanDraft, SchoolPlanDraft, WorkPlanDraft } from "@/lib/plan-analysis/types";
import { WEEKDAY_ORDER } from "@/lib/format";
import {
  detectDraftConflicts,
  type PlanConflict,
} from "@/lib/data/conflicts";
import {
  conflictKey,
  type ConflictResolution,
} from "@/lib/data/conflict-resolution";

export type ApplyMode = "replace" | "merge";

function stripSchoolUncertainty(draft: SchoolPlanDraft): Partial<Record<WeekdayKey, SchoolDay>> {
  const week: Partial<Record<WeekdayKey, SchoolDay>> = {};
  for (const day of WEEKDAY_ORDER) {
    const entry = draft.week[day];
    if (!entry) continue;
    week[day] = {
      lessons: entry.lessons.map((lesson) => {
        const { uncertain, ...rest } = lesson;
        void uncertain;
        return rest;
      }),
    };
  }
  return week;
}

function stripWorkUncertainty(draft: WorkPlanDraft): Partial<Record<WeekdayKey, WorkShiftDay>> {
  const week: Partial<Record<WeekdayKey, WorkShiftDay>> = {};
  for (const day of WEEKDAY_ORDER) {
    const entry = draft.week[day];
    if (!entry) continue;
    const { uncertain, ...shift } = entry;
    void uncertain;
    week[day] = shift;
  }
  return week;
}

function lessonLabel(lesson: SchoolLesson): string {
  return `${lesson.time} ${lesson.subject}`;
}

function shiftLabel(shift: WorkShiftDay): string {
  return `${shift.start}–${shift.end} ${shift.label}`;
}

function filterIncomingByResolutions(
  draft: PlanDraft,
  conflicts: PlanConflict[],
  resolutions: Record<string, ConflictResolution>,
): PlanDraft {
  if (conflicts.length === 0) return draft;

  if (draft.type === "school") {
    const week = structuredClone(draft.week);
    for (const conflict of conflicts) {
      const res = resolutions[conflictKey(conflict)] ?? "both";
      if (res === "keep") {
        const day = week[conflict.day];
        if (!day) continue;
        day.lessons = day.lessons.filter(
          (l) => lessonLabel(l) !== conflict.incomingLabel,
        );
        if (day.lessons.length === 0) delete week[conflict.day];
      }
      // take / both: keep incoming; take removes existing later
    }
    return { ...draft, week };
  }

  const week = structuredClone(draft.week);
  for (const conflict of conflicts) {
    const res = resolutions[conflictKey(conflict)] ?? "both";
    if (res === "keep") {
      delete week[conflict.day];
    }
  }
  return { ...draft, week };
}

function removeExistingTaken(
  existing: Partial<Record<WeekdayKey, SchoolDay>>,
  conflicts: PlanConflict[],
  resolutions: Record<string, ConflictResolution>,
): Partial<Record<WeekdayKey, SchoolDay>> {
  const next = structuredClone(existing);
  for (const conflict of conflicts) {
    const res = resolutions[conflictKey(conflict)] ?? "both";
    if (res !== "take") continue;
    const day = next[conflict.day];
    if (!day) continue;
    day.lessons = day.lessons.filter((l) => lessonLabel(l) !== conflict.existingLabel);
    if (day.lessons.length === 0) delete next[conflict.day];
  }
  return next;
}

function removeExistingWorkTaken(
  existing: Partial<Record<WeekdayKey, WorkShiftDay>>,
  conflicts: PlanConflict[],
  resolutions: Record<string, ConflictResolution>,
): Partial<Record<WeekdayKey, WorkShiftDay>> {
  const next = { ...existing };
  for (const conflict of conflicts) {
    const res = resolutions[conflictKey(conflict)] ?? "both";
    if (res === "take") {
      delete next[conflict.day];
    }
  }
  return next;
}

function mergeSchool(
  existing: Partial<Record<WeekdayKey, SchoolDay>>,
  incoming: Partial<Record<WeekdayKey, SchoolDay>>,
): Partial<Record<WeekdayKey, SchoolDay>> {
  const next = { ...existing };
  for (const day of WEEKDAY_ORDER) {
    const add = incoming[day];
    if (!add) continue;
    const prev = next[day];
    if (!prev) {
      next[day] = add;
      continue;
    }
    const seen = new Set(prev.lessons.map((l) => `${l.time}|${l.subject}`));
    const merged = [...prev.lessons];
    for (const lesson of add.lessons) {
      const key = `${lesson.time}|${lesson.subject}`;
      if (!seen.has(key)) {
        merged.push(lesson);
        seen.add(key);
      }
    }
    merged.sort((a, b) => a.time.localeCompare(b.time));
    next[day] = { lessons: merged };
  }
  return next;
}

function mergeWork(
  existing: Partial<Record<WeekdayKey, WorkShiftDay>>,
  incoming: Partial<Record<WeekdayKey, WorkShiftDay>>,
  conflicts: PlanConflict[],
  resolutions: Record<string, ConflictResolution>,
): Partial<Record<WeekdayKey, WorkShiftDay>> {
  const next = { ...existing };
  for (const day of WEEKDAY_ORDER) {
    const add = incoming[day];
    if (!add) continue;
    const conflict = conflicts.find((c) => c.day === day);
    const res = conflict ? resolutions[conflictKey(conflict)] ?? "both" : undefined;
    if (res === "both" && next[day]) {
      const prev = next[day]!;
      next[day] = {
        ...prev,
        notes: [prev.notes, `Konflikt-Entwurf: ${shiftLabel(add)} @ ${add.location}`]
          .filter(Boolean)
          .join(" · "),
      };
      continue;
    }
    next[day] = add;
  }
  return next;
}

export function personHasScheduleContent(person: PersonProfile, mode: PlanDraft["type"]): boolean {
  if (person.schedule.type !== mode) return false;
  return Object.keys(person.schedule.week).length > 0;
}

export function applyPlanDraft(
  person: PersonProfile,
  draft: PlanDraft,
  applyMode: ApplyMode,
  options?: {
    conflicts?: PlanConflict[];
    resolutions?: Record<string, ConflictResolution>;
  },
): PersonProfile {
  const conflicts =
    options?.conflicts ??
    detectDraftConflicts(person.schedule, draft);
  const resolutions = options?.resolutions ?? {};
  const filteredDraft = filterIncomingByResolutions(draft, conflicts, resolutions);

  if (filteredDraft.type === "school") {
    const incoming = stripSchoolUncertainty(filteredDraft);
    let existing =
      person.schedule.type === "school" ? person.schedule.week : {};
    if (applyMode === "merge") {
      existing = removeExistingTaken(existing, conflicts, resolutions);
    }
    const week =
      applyMode === "replace" ? incoming : mergeSchool(existing, incoming);
    const schedule: Schedule = { type: "school", week };
    return { ...person, schedule };
  }

  const incoming = stripWorkUncertainty(filteredDraft);
  let existing = person.schedule.type === "work" ? person.schedule.week : {};
  if (applyMode === "merge") {
    existing = removeExistingWorkTaken(existing, conflicts, resolutions);
  }
  const week = applyMode === "replace" ? incoming : mergeWork(existing, incoming, conflicts, resolutions);
  const schedule: Schedule = { type: "work", week };
  return { ...person, schedule };
}

export function defaultPlanTypeForPerson(person: PersonProfile): "school" | "work" {
  if (person.schedule.type === "work") return "work";
  if (person.schedule.type === "school") return "school";
  return "school";
}
