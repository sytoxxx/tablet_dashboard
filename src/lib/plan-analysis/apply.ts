import type {
  PersonProfile,
  Schedule,
  SchoolDay,
  SchoolLesson,
  WeekdayKey,
  WorkPlanEntry,
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

/**
 * Drops the analysis-only fields, keeping the real dated entry. Never
 * applies a "work" row whose time couldn't be resolved — that would write a
 * shift with an invented (empty) start/end into real data instead of
 * surfacing it for review, which downstream bus/dashboard logic assumes is
 * always a valid HH:MM. Such rows are excluded here as a last line of
 * defense; the UI is expected to have already blocked confirming while any
 * are unresolved.
 */
function stripWorkUncertainty(draft: WorkPlanDraft): WorkPlanEntry[] {
  return draft.entries
    .filter((e) => !(e.status === "work" && (!e.start || !e.end)))
    .map(
      ({
        uncertain,
        weekday,
        code,
        unresolvedCode,
        timeUnclear,
        confidence,
        reviewed,
        baseUncertain,
        ...entry
      }) => {
        void uncertain;
        void weekday;
        void code;
        void unresolvedCode;
        void timeUnclear;
        void confidence;
        void reviewed;
        void baseUncertain;
        return entry;
      },
    );
}

function lessonLabel(lesson: SchoolLesson): string {
  return `${lesson.time} ${lesson.subject}`;
}

function shiftLabel(entry: WorkPlanEntry): string {
  if (entry.status !== "work") return entry.label;
  return `${entry.start}–${entry.end} ${entry.label}`;
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

  const keepDates = new Set(
    conflicts
      .filter((c) => (resolutions[conflictKey(c)] ?? "both") === "keep")
      .map((c) => c.date),
  );
  if (keepDates.size === 0) return draft;
  return { ...draft, entries: draft.entries.filter((e) => !keepDates.has(e.date)) };
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

/** Drops existing dated entries the user chose to overwrite ("take") ahead of a date-keyed merge. */
function removeExistingWorkEntriesTaken(
  existing: WorkPlanEntry[],
  conflicts: PlanConflict[],
  resolutions: Record<string, ConflictResolution>,
): WorkPlanEntry[] {
  const takeDates = new Set(
    conflicts
      .filter((c) => (resolutions[conflictKey(c)] ?? "both") === "take")
      .map((c) => c.date),
  );
  if (takeDates.size === 0) return existing;
  return existing.filter((e) => !takeDates.has(e.date));
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

/** Merge by exact date — a date present in both keeps/takes/combines per its conflict resolution. */
function mergeWorkEntries(
  existing: WorkPlanEntry[],
  incoming: WorkPlanEntry[],
  conflicts: PlanConflict[],
  resolutions: Record<string, ConflictResolution>,
): WorkPlanEntry[] {
  const byDate = new Map(existing.map((e) => [e.date, e]));
  for (const add of incoming) {
    const conflict = conflicts.find((c) => c.date === add.date);
    const res = conflict ? (resolutions[conflictKey(conflict)] ?? "both") : undefined;
    const prev = byDate.get(add.date);
    if (res === "both" && prev) {
      byDate.set(add.date, {
        ...prev,
        notes: [prev.notes, `Konflikt-Entwurf: ${shiftLabel(add)} @ ${add.location}`]
          .filter(Boolean)
          .join(" · "),
      });
      continue;
    }
    byDate.set(add.date, add);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Replace mode for dated entries: only the date range actually covered by
 * the new upload is replaced — entries for other months are left alone, so
 * uploading October's plan can never wipe September's.
 */
function replaceWorkEntriesInRange(
  existing: WorkPlanEntry[],
  incoming: WorkPlanEntry[],
): WorkPlanEntry[] {
  if (incoming.length === 0) return existing;
  const dates = incoming.map((e) => e.date);
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));
  const outside = existing.filter((e) => e.date < minDate || e.date > maxDate);
  return [...outside, ...incoming].sort((a, b) => a.date.localeCompare(b.date));
}

export function personHasScheduleContent(person: PersonProfile, mode: PlanDraft["type"]): boolean {
  if (person.schedule.type !== mode) return false;
  if (person.schedule.type === "work") {
    return (
      Object.keys(person.schedule.week).length > 0 ||
      Boolean(person.schedule.entries?.length)
    );
  }
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
  const existingWeek = person.schedule.type === "work" ? person.schedule.week : {};
  let existingEntries = person.schedule.type === "work" ? (person.schedule.entries ?? []) : [];

  let entries: WorkPlanEntry[];
  if (applyMode === "replace") {
    entries = replaceWorkEntriesInRange(existingEntries, incoming);
  } else {
    existingEntries = removeExistingWorkEntriesTaken(existingEntries, conflicts, resolutions);
    entries = mergeWorkEntries(existingEntries, incoming, conflicts, resolutions);
  }

  const schedule: Schedule = { type: "work", week: existingWeek, entries };
  return { ...person, schedule };
}

export function defaultPlanTypeForPerson(person: PersonProfile): "school" | "work" {
  if (person.schedule.type === "work") return "work";
  if (person.schedule.type === "school") return "school";
  return "school";
}
