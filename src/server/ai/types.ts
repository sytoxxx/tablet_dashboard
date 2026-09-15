import type { PlanAnalysisMode, PlanAnalysisResult } from "@/lib/plan-analysis/types";

export type PlanAiInput = {
  planType: PlanAnalysisMode;
  personId: string;
  personName: string;
  /** Base64 data URL or raw base64 — providers may ignore content in mock mode. */
  imageBase64: string;
  mimeType: string;
};

export interface PlanAiProvider {
  readonly name: "mock" | "openai";
  analyze(input: PlanAiInput): Promise<PlanAnalysisResult>;
}
