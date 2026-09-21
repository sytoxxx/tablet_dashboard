import type { PlanAnalysisMode, PlanAnalysisResult } from "@/lib/plan-analysis/types";

export type PlanAiImage = {
  /** Raw base64 (no data: prefix) — providers may ignore content in mock mode. */
  base64: string;
  mimeType: string;
};

export type PlanAiInput = {
  planType: PlanAnalysisMode;
  personId: string;
  personName: string;
  /** One entry per page/photo — a multi-page PDF or multi-photo upload sends all of them in one analysis. */
  images: PlanAiImage[];
  /** Server "now" — used to infer a missing year and to date the mock example. */
  referenceDate: Date;
};

export interface PlanAiProvider {
  readonly name: "mock" | "openai";
  analyze(input: PlanAiInput): Promise<PlanAnalysisResult>;
}
