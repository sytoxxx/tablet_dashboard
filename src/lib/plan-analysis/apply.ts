import type { PersonProfile, Schedule, SchoolDay, WeekdayKey, WorkShiftDay } from "@/lib/types";
import type { PlanDraft, SchoolPlanDraft, WorkPlanDraft } from "@/lib/plan-analysis/types";
import { WEEKDAY_ORDER } from "@/lib/format";

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
): Partial<Record<WeekdayKey, WorkShiftDay>> {
  return { ...existing, ...incoming };
}

export function personHasScheduleContent(person: PersonProfile, mode: PlanDraft["type"]): boolean {
  if (person.schedule.type !== mode) return false;
  return Object.keys(person.schedule.week).length > 0;
}

export function applyPlanDraft(
  person: PersonProfile,
  draft: PlanDraft,
  applyMode: ApplyMode,
): PersonProfile {
  if (draft.type === "school") {
    const incoming = stripSchoolUncertainty(draft);
    const existing =
      person.schedule.type === "school" ? person.schedule.week : {};
    const week =
      applyMode === "replace" ? incoming : mergeSchool(existing, incoming);
    const schedule: Schedule = { type: "school", week };
    return { ...person, schedule };
  }

  const incoming = stripWorkUncertainty(draft);
  const existing = person.schedule.type === "work" ? person.schedule.week : {};
  const week = applyMode === "replace" ? incoming : mergeWork(existing, incoming);
  const schedule: Schedule = { type: "work", week };
  return { ...person, schedule };
}

export function defaultPlanTypeForPerson(person: PersonProfile): "school" | "work" {
  if (person.schedule.type === "work") return "work";
  if (person.schedule.type === "school") return "school";
  return "school";
}
