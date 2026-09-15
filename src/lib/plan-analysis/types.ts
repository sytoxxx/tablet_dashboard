import type {
  SchoolDay,
  SchoolLesson,
  WeekdayKey,
  WorkShiftDay,
} from "@/lib/types";

export type PlanAnalysisMode = "school" | "work";

export type UncertaintyMark = {
  /** Dot path e.g. "week.mon.lessons.0.room" */
  path: string;
  reason: string;
};

export type AnalyzedSchoolLesson = SchoolLesson & {
  uncertain?: boolean;
};

export type AnalyzedSchoolDay = {
  lessons: AnalyzedSchoolLesson[];
};

export type AnalyzedWorkShift = WorkShiftDay & {
  uncertain?: boolean;
};

export type SchoolPlanDraft = {
  type: "school";
  week: Partial<Record<WeekdayKey, AnalyzedSchoolDay>>;
};

export type WorkPlanDraft = {
  type: "work";
  week: Partial<Record<WeekdayKey, AnalyzedWorkShift>>;
};

export type PlanDraft = SchoolPlanDraft | WorkPlanDraft;

export type PlanAnalysisResult = {
  mode: PlanAnalysisMode;
  source: "mock" | "ai";
  confidence: number;
  draft: PlanDraft;
  uncertainties: UncertaintyMark[];
  warnings: string[];
};

export type PlanAnalyzeRequestMeta = {
  personId: string;
  planType: PlanAnalysisMode;
};

/** Normalized week shapes used when applying to PersonProfile.schedule */
export type SchoolWeek = Partial<Record<WeekdayKey, SchoolDay>>;
export type WorkWeek = Partial<Record<WeekdayKey, WorkShiftDay>>;
