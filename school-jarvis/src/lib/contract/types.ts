/**
 * Coffee Morning Integration Contract (School Jarvis → Coffee Morning).
 * Must stay aligned with Coffee Morning's SchoolJarvisDailySummary.
 */

export type CoffeePersonId = "levi" | "birgit" | "heidi";

export type SchoolJarvisAction = {
  label: string;
  /** Opaque target, e.g. "recommended-learning". */
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
  /** Topic labels from existing error/learning signals — never invent. */
  weakTopics: string[];
  dueFlashcards: number;
};

/**
 * Compact daily digest. School Jarvis is the single source of truth.
 * Coffee Morning only displays this — no learning logic there.
 */
export type SchoolJarvisDailySummary = {
  available: boolean;
  personId: CoffeePersonId;
  focusDate: string;
  nextExam: SchoolJarvisNextExam | null;
  today: SchoolJarvisToday | null;
  learning: SchoolJarvisLearning | null;
  action: SchoolJarvisAction | null;
};
