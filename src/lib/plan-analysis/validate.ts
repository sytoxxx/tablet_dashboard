import type { WeekdayKey } from "@/lib/types";
import { WEEKDAY_ORDER } from "@/lib/format";
import type {
  AnalyzedSchoolLesson,
  AnalyzedWorkShift,
  PlanAnalysisMode,
  PlanAnalysisResult,
  PlanDraft,
  SchoolPlanDraft,
  UncertaintyMark,
  WorkPlanDraft,
} from "@/lib/plan-analysis/types";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isWeekday(value: string): value is WeekdayKey {
  return (WEEKDAY_ORDER as string[]).includes(value);
}

function cleanText(value: unknown, max = 80): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value
    .trim()
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function parseLesson(
  raw: unknown,
  path: string,
  uncertainties: UncertaintyMark[],
): AnalyzedSchoolLesson | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const time = cleanText(obj.time, 5);
  const subject = cleanText(obj.subject, 60);
  const room = cleanText(obj.room, 40);
  if (!time || !TIME_RE.test(time) || !subject) return null;

  const lesson: AnalyzedSchoolLesson = {
    id: cleanText(obj.id, 40) ?? `lesson-${path}`,
    time,
    subject,
    room: room ?? "?",
    uncertain: Boolean(obj.uncertain) || !room || room === "?",
  };

  if (Array.isArray(obj.bringItems)) {
    const items = obj.bringItems
      .map((i) => cleanText(i, 40))
      .filter((i): i is string => Boolean(i));
    if (items.length) lesson.bringItems = items;
  }

  if (!room || room === "?") {
    uncertainties.push({ path: `${path}.room`, reason: "Raum unklar oder fehlend" });
    lesson.uncertain = true;
  }
  if (obj.uncertain) {
    uncertainties.push({ path, reason: "Vom Modell als unsicher markiert" });
  }

  return lesson;
}

function parseWorkShift(
  raw: unknown,
  path: string,
  uncertainties: UncertaintyMark[],
): AnalyzedWorkShift | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const label = cleanText(obj.label, 80);
  const start = cleanText(obj.start, 5);
  const end = cleanText(obj.end, 5);
  const location = cleanText(obj.location, 60);
  if (!label || !start || !end || !TIME_RE.test(start) || !TIME_RE.test(end)) return null;

  const shift: AnalyzedWorkShift = {
    label,
    start,
    end,
    location: location ?? "?",
    uncertain: Boolean(obj.uncertain) || !location || location === "?",
  };

  const notes = cleanText(obj.notes, 160);
  if (notes) shift.notes = notes;

  if (Array.isArray(obj.bringItems)) {
    const items = obj.bringItems
      .map((i) => cleanText(i, 40))
      .filter((i): i is string => Boolean(i));
    if (items.length) shift.bringItems = items;
  }

  if (!location || location === "?") {
    uncertainties.push({ path: `${path}.location`, reason: "Ort unklar oder fehlend" });
    shift.uncertain = true;
  }

  return shift;
}

export function validatePlanAnalysis(
  raw: unknown,
  expectedMode: PlanAnalysisMode,
): { ok: true; result: PlanAnalysisResult } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Ungültige Analyse-Antwort." };
  }

  const obj = raw as Record<string, unknown>;
  const mode = obj.mode === "school" || obj.mode === "work" ? obj.mode : expectedMode;
  if (mode !== expectedMode) {
    return { ok: false, error: `Erwartet ${expectedMode}, erhalten ${String(obj.mode)}.` };
  }

  const source = obj.source === "ai" ? "ai" : "mock";
  const confidence =
    typeof obj.confidence === "number" && obj.confidence >= 0 && obj.confidence <= 1
      ? obj.confidence
      : 0.5;

  const warnings = Array.isArray(obj.warnings)
    ? obj.warnings.filter((w): w is string => typeof w === "string").slice(0, 20)
    : [];

  const uncertainties: UncertaintyMark[] = [];
  const draftRaw = obj.draft;
  if (!draftRaw || typeof draftRaw !== "object") {
    return { ok: false, error: "Draft fehlt in der Analyse." };
  }

  const draftObj = draftRaw as Record<string, unknown>;
  const weekRaw = draftObj.week;
  if (!weekRaw || typeof weekRaw !== "object") {
    return { ok: false, error: "Wochenplan fehlt." };
  }

  let draft: PlanDraft;

  if (mode === "school") {
    const week: SchoolPlanDraft["week"] = {};
    for (const [key, value] of Object.entries(weekRaw as Record<string, unknown>)) {
      if (!isWeekday(key)) continue;
      const day = value as { lessons?: unknown };
      if (!day || !Array.isArray(day.lessons)) continue;
      const lessons = day.lessons
        .map((lesson, index) =>
          parseLesson(lesson, `week.${key}.lessons.${index}`, uncertainties),
        )
        .filter((l): l is AnalyzedSchoolLesson => Boolean(l));
      if (lessons.length) week[key] = { lessons };
    }
    if (Object.keys(week).length === 0) {
      return { ok: false, error: "Keine gültigen Unterrichtsstunden erkannt." };
    }
    draft = { type: "school", week };
  } else {
    const week: WorkPlanDraft["week"] = {};
    for (const [key, value] of Object.entries(weekRaw as Record<string, unknown>)) {
      if (!isWeekday(key)) continue;
      const shift = parseWorkShift(value, `week.${key}`, uncertainties);
      if (shift) week[key] = shift;
    }
    if (Object.keys(week).length === 0) {
      return { ok: false, error: "Keine gültigen Schichten erkannt." };
    }
    draft = { type: "work", week };
  }

  if (Array.isArray(obj.uncertainties)) {
    for (const u of obj.uncertainties) {
      if (u && typeof u === "object") {
        const path = cleanText((u as UncertaintyMark).path, 120);
        const reason = cleanText((u as UncertaintyMark).reason, 160);
        if (path && reason) uncertainties.push({ path, reason });
      }
    }
  }

  return {
    ok: true,
    result: {
      mode,
      source,
      confidence,
      draft,
      uncertainties,
      warnings,
    },
  };
}
