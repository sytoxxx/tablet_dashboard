import type {
  SchoolDay,
  SchoolLesson,
  WeekdayKey,
  WorkPlanEntry,
  WorkShiftDay,
} from "@/lib/types";

export type PlanAnalysisMode = "school" | "work";

export type UncertaintyMark = {
  /** Dot path e.g. "week.mon.lessons.0.room" or "entries.3.date" */
  path: string;
  reason: string;
};

export type AnalyzedSchoolLesson = SchoolLesson & {
  uncertain?: boolean;
};

export type AnalyzedSchoolDay = {
  lessons: AnalyzedSchoolLesson[];
};

/**
 * A dated work-plan row as extracted from an uploaded roster — the primary
 * shape for work-plan analysis. `weekday` is the plan's own printed weekday
 * (kept for display / cross-check against `date`), never authoritative on
 * its own.
 */
export type AnalyzedWorkEntry = WorkPlanEntry & {
  uncertain?: boolean;
  weekday?: WeekdayKey;
  /** Raw shift/duty code as printed (e.g. "FD", "K") — kept so a legend/user answer can resolve it. */
  code?: string;
  /** True while `code` could not be resolved against a legend or known German label — blocks silent save. */
  unresolvedCode?: boolean;
  /** True when a start/end time was present but could not be parsed unambiguously — never guessed. */
  timeUnclear?: boolean;
  /** 0–1 per-entry confidence, when the source supplied one. Low values force `uncertain`. */
  confidence?: number;
  /** Client-only: user has looked at this flagged entry and accepted/corrected it. Stripped before saving. */
  reviewed?: boolean;
  /**
   * `uncertain` minus anything caused by the resolved calendar year (weekday
   * match, plausibility-vs-period). Lets a year correction recompute the
   * year-dependent parts without losing or duplicating the year-independent
   * ones. Analysis-only, stripped before saving.
   */
  baseUncertain?: boolean;
};

export type SchoolPlanDraft = {
  type: "school";
  week: Partial<Record<WeekdayKey, AnalyzedSchoolDay>>;
};

export type WorkPlanDraft = {
  type: "work";
  entries: AnalyzedWorkEntry[];
};

export type PlanDraft = SchoolPlanDraft | WorkPlanDraft;

/**
 * The document's own declared month/year (e.g. a "September 2026" header).
 * `yearCertain: false` means the year had to be inferred (nearest to today)
 * rather than actually read — the UI must ask the user to confirm it before
 * saving, never save the guess silently.
 */
export type PlanPeriod = {
  month: number | null;
  year: number | null;
  yearCertain: boolean;
  monthCertain: boolean;
};

export type PlanAnalysisResult = {
  mode: PlanAnalysisMode;
  source: "mock" | "ai";
  confidence: number;
  draft: PlanDraft;
  uncertainties: UncertaintyMark[];
  warnings: string[];
  /** Declared or inferred month/year for a work plan — null fields mean "not recognized". */
  period?: PlanPeriod;
  /** Shift-code legend as read from the document (code -> meaning), when one is visible. */
  legend?: Record<string, string>;
  /** Distinct duty codes used in the draft that could not be resolved via the legend or known labels. */
  unknownCodes?: string[];
};

export type PlanAnalyzeRequestMeta = {
  personId: string;
  planType: PlanAnalysisMode;
};

/** Normalized week shape used when applying a school draft to PersonProfile.schedule */
export type SchoolWeek = Partial<Record<WeekdayKey, SchoolDay>>;
/** Legacy recurring-weekday shape, still used for the manually-edited baseline pattern. */
export type WorkWeek = Partial<Record<WeekdayKey, WorkShiftDay>>;
