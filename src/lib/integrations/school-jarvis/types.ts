import type { PersonId } from "@/lib/types";

/**
 * Neutral deep-link / action token for School Jarvis.
 * Coffee Morning only displays `label` and passes `target` through —
 * it must not interpret learning-session internals.
 */
export type SchoolJarvisAction = {
  label: string;
  /** Opaque target token, e.g. "recommended-learning". */
  target: string;
};

export type SchoolJarvisNextExam = {
  subject: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  daysUntil: number;
};

export type SchoolJarvisToday = {
  recommendedStudyMinutes: number;
  recommendation: string;
};

export type SchoolJarvisLearning = {
  weakTopics: string[];
  dueFlashcards: number;
};

/**
 * Compact daily digest from School Jarvis → Coffee Morning.
 * School Jarvis is the single source of truth for all learning data.
 * Coffee Morning only displays this summary — no learning logic here.
 */
export type SchoolJarvisDailySummary = {
  /** false when School Jarvis has nothing useful for this person/day. */
  available: boolean;
  /** Person this summary belongs to — never mix profiles. */
  personId: PersonId;
  /** ISO date the summary was built for (YYYY-MM-DD). */
  focusDate: string;
  nextExam: SchoolJarvisNextExam | null;
  today: SchoolJarvisToday | null;
  learning: SchoolJarvisLearning | null;
  action: SchoolJarvisAction | null;
};

/**
 * Transport envelope for GET /api/integrations/coffee/school-summary
 * (Coffee Morning browser ← Coffee Morning server).
 * Secrets never appear in this payload.
 */
export type SchoolJarvisSummaryResponse =
  | {
      ok: true;
      source: "school-jarvis" | "cache";
      summary: SchoolJarvisDailySummary;
      /** Resolved handoff URL for action.target — null if not configured. */
      handoffUrl: string | null;
    }
  | {
      ok: false;
      unavailable: true;
      message: string;
      /** Never invent learning data when unavailable. */
      summary: null;
      handoffUrl: null;
    };
