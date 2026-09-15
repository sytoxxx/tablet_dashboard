import type { PersonId } from "@/lib/types";
import type {
  SchoolJarvisAction,
  SchoolJarvisDailySummary,
  SchoolJarvisLearning,
  SchoolJarvisNextExam,
  SchoolJarvisToday,
} from "@/lib/integrations/school-jarvis/types";

const PERSON_IDS: PersonId[] = ["levi", "birgit", "heidi"];

export type ValidateSummaryResult =
  | { ok: true; summary: SchoolJarvisDailySummary }
  | { ok: false; error: string };

function isPersonId(value: unknown): value is PersonId {
  return typeof value === "string" && PERSON_IDS.includes(value as PersonId);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateNextExam(
  raw: unknown,
): { ok: true; value: SchoolJarvisNextExam | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "nextExam ungültig." };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.subject !== "string" || !o.subject.trim()) {
    return { ok: false, error: "nextExam.subject fehlt." };
  }
  if (!isIsoDate(o.date)) {
    return { ok: false, error: "nextExam.date muss YYYY-MM-DD sein." };
  }
  if (typeof o.daysUntil !== "number" || !Number.isFinite(o.daysUntil)) {
    return { ok: false, error: "nextExam.daysUntil ungültig." };
  }
  return {
    ok: true,
    value: {
      subject: o.subject.trim(),
      date: o.date,
      daysUntil: Math.trunc(o.daysUntil),
    },
  };
}

function validateToday(
  raw: unknown,
): { ok: true; value: SchoolJarvisToday | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "today ungültig." };
  }
  const o = raw as Record<string, unknown>;
  if (
    typeof o.recommendedStudyMinutes !== "number" ||
    !Number.isFinite(o.recommendedStudyMinutes) ||
    o.recommendedStudyMinutes < 0
  ) {
    return { ok: false, error: "today.recommendedStudyMinutes ungültig." };
  }
  if (typeof o.recommendation !== "string" || !o.recommendation.trim()) {
    return { ok: false, error: "today.recommendation fehlt." };
  }
  return {
    ok: true,
    value: {
      recommendedStudyMinutes: Math.trunc(o.recommendedStudyMinutes),
      recommendation: o.recommendation.trim(),
    },
  };
}

function validateLearning(
  raw: unknown,
): { ok: true; value: SchoolJarvisLearning | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "learning ungültig." };
  }
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.weakTopics) || !o.weakTopics.every((t) => typeof t === "string")) {
    return { ok: false, error: "learning.weakTopics ungültig." };
  }
  if (typeof o.dueFlashcards !== "number" || !Number.isFinite(o.dueFlashcards) || o.dueFlashcards < 0) {
    return { ok: false, error: "learning.dueFlashcards ungültig." };
  }
  return {
    ok: true,
    value: {
      weakTopics: o.weakTopics.map((t) => String(t).trim()).filter(Boolean).slice(0, 12),
      dueFlashcards: Math.trunc(o.dueFlashcards),
    },
  };
}

function validateAction(
  raw: unknown,
): { ok: true; value: SchoolJarvisAction | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "action ungültig." };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.label !== "string" || !o.label.trim()) {
    return { ok: false, error: "action.label fehlt." };
  }
  if (typeof o.target !== "string" || !o.target.trim()) {
    return { ok: false, error: "action.target fehlt." };
  }
  return {
    ok: true,
    value: { label: o.label.trim(), target: o.target.trim() },
  };
}

/**
 * Validate an untrusted School Jarvis payload.
 * Rejects invented shapes; does not compute learning recommendations.
 */
export function validateSchoolJarvisDailySummary(
  raw: unknown,
): ValidateSummaryResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Summary fehlt oder ist kein Objekt." };
  }
  const o = raw as Record<string, unknown>;

  if (typeof o.available !== "boolean") {
    return { ok: false, error: "available muss boolean sein." };
  }
  if (!isPersonId(o.personId)) {
    return { ok: false, error: "personId ungültig." };
  }
  if (!isIsoDate(o.focusDate)) {
    return { ok: false, error: "focusDate muss YYYY-MM-DD sein." };
  }

  const nextExam = validateNextExam(o.nextExam ?? null);
  if (!nextExam.ok) return nextExam;
  const today = validateToday(o.today ?? null);
  if (!today.ok) return today;
  const learning = validateLearning(o.learning ?? null);
  if (!learning.ok) return learning;
  const action = validateAction(o.action ?? null);
  if (!action.ok) return action;

  return {
    ok: true,
    summary: {
      available: o.available,
      personId: o.personId,
      focusDate: o.focusDate,
      nextExam: nextExam.value,
      today: today.value,
      learning: learning.value,
      action: action.value,
    },
  };
}
