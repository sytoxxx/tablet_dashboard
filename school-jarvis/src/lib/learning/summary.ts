import type {
  CoffeePersonId,
  SchoolJarvisDailySummary,
} from "@/lib/contract/types";
import type { LearningDataSource, LearningSnapshot } from "@/lib/learning/data-source";
import { getLearningDataSource } from "@/lib/learning/data-source";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function daysBetween(focusDate: string, examDate: string): number {
  const a = Date.UTC(
    Number(focusDate.slice(0, 4)),
    Number(focusDate.slice(5, 7)) - 1,
    Number(focusDate.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(examDate.slice(0, 4)),
    Number(examDate.slice(5, 7)) - 1,
    Number(examDate.slice(8, 10)),
  );
  return Math.round((b - a) / 86_400_000);
}

function unavailable(
  personId: CoffeePersonId,
  focusDate: string,
): SchoolJarvisDailySummary {
  return {
    available: false,
    personId,
    focusDate,
    nextExam: null,
    today: null,
    learning: null,
    action: null,
  };
}

/**
 * Pick the next exam on/after focusDate. Never invent subjects or dates.
 */
export function selectNextExam(
  snapshot: LearningSnapshot,
  personId: CoffeePersonId,
  focusDate: string,
): SchoolJarvisDailySummary["nextExam"] {
  const upcoming = snapshot.exams
    .filter(
      (e) =>
        e.personId === personId &&
        ISO_DATE.test(e.date) &&
        e.date >= focusDate &&
        e.subject.trim(),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const next = upcoming[0];
  if (!next) return null;
  return {
    subject: next.subject.trim(),
    date: next.date,
    daysUntil: daysBetween(focusDate, next.date),
  };
}

/**
 * Count due flashcards for focusDate (dueDate <= focusDate). Never invent cards.
 */
export function countDueFlashcards(
  snapshot: LearningSnapshot,
  personId: CoffeePersonId,
  focusDate: string,
): number {
  return snapshot.flashcards.filter(
    (c) =>
      c.personId === personId &&
      ISO_DATE.test(c.dueDate) &&
      c.dueDate <= focusDate,
  ).length;
}

/**
 * Distinct weak topic labels from existing learning/error signals.
 */
export function collectWeakTopics(
  snapshot: LearningSnapshot,
  personId: CoffeePersonId,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of snapshot.weakTopics) {
    if (row.personId !== personId) continue;
    const topic = row.topic.trim();
    if (!topic || seen.has(topic)) continue;
    seen.add(topic);
    out.push(topic);
    if (out.length >= 12) break;
  }
  return out;
}

/**
 * Use stored recommendation for the focus date when present.
 * Conservative fallback minutes only when there is a real learning signal
 * (due cards or weak topics) and no stored recommendation text/plan.
 */
export function buildTodayBlock(
  snapshot: LearningSnapshot,
  personId: CoffeePersonId,
  focusDate: string,
  dueFlashcards: number,
  weakTopics: string[],
): SchoolJarvisDailySummary["today"] {
  const stored = snapshot.recommendations.find(
    (r) =>
      r.personId === personId &&
      r.focusDate === focusDate &&
      r.recommendation.trim() &&
      Number.isFinite(r.recommendedStudyMinutes) &&
      r.recommendedStudyMinutes >= 0,
  );
  if (stored) {
    return {
      recommendedStudyMinutes: Math.trunc(stored.recommendedStudyMinutes),
      recommendation: stored.recommendation.trim(),
    };
  }

  if (dueFlashcards <= 0 && weakTopics.length === 0) {
    return null;
  }

  // Conservative fallback — only when real signals exist; no invented content.
  const minutes = Math.min(45, Math.max(10, dueFlashcards > 0 ? 15 + dueFlashcards : 20));
  const parts: string[] = [];
  if (dueFlashcards > 0) {
    parts.push(`${dueFlashcards} fällige Karteikarten wiederholen`);
  }
  if (weakTopics.length > 0) {
    parts.push(`Schwache Themen: ${weakTopics.slice(0, 3).join(", ")}`);
  }
  return {
    recommendedStudyMinutes: minutes,
    recommendation: parts.join(". ") + ".",
  };
}

/**
 * Build Coffee Morning digest from existing learning signals only.
 */
export function buildDailySummaryFromSnapshot(input: {
  personId: CoffeePersonId;
  focusDate: string;
  snapshot: LearningSnapshot | null;
}): SchoolJarvisDailySummary {
  const { personId, focusDate } = input;

  if (!ISO_DATE.test(focusDate)) {
    return unavailable(personId, focusDate || "1970-01-01");
  }

  if (input.snapshot === null) {
    return unavailable(personId, focusDate);
  }

  const nextExam = selectNextExam(input.snapshot, personId, focusDate);
  const dueFlashcards = countDueFlashcards(input.snapshot, personId, focusDate);
  const weakTopics = collectWeakTopics(input.snapshot, personId);
  const today = buildTodayBlock(
    input.snapshot,
    personId,
    focusDate,
    dueFlashcards,
    weakTopics,
  );

  const hasLearning =
    dueFlashcards > 0 || weakTopics.length > 0 || today !== null;
  const learning =
    hasLearning || nextExam
      ? { weakTopics, dueFlashcards }
      : null;

  const hasAnything = Boolean(nextExam || today || (learning && (learning.dueFlashcards > 0 || learning.weakTopics.length > 0)));

  if (!hasAnything) {
    return unavailable(personId, focusDate);
  }

  return {
    available: true,
    personId,
    focusDate,
    nextExam,
    today,
    learning: learning ?? { weakTopics: [], dueFlashcards: 0 },
    action:
      today || dueFlashcards > 0 || weakTopics.length > 0
        ? { label: "Jetzt lernen", target: "recommended-learning" }
        : null,
  };
}

export async function buildDailySummary(input: {
  personId: CoffeePersonId;
  focusDate: string;
  source?: LearningDataSource;
}): Promise<SchoolJarvisDailySummary> {
  const source = input.source ?? getLearningDataSource();
  const snapshot = await source.loadForPerson(input.personId);
  return buildDailySummaryFromSnapshot({
    personId: input.personId,
    focusDate: input.focusDate,
    snapshot,
  });
}

export function todayIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
