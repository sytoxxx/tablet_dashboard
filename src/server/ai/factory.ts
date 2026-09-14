import type { PlanAiProvider } from "@/server/ai/types";
import { MockPlanAi } from "@/server/ai/mock";
import { OpenAiPlanAi } from "@/server/ai/openai";

export function createPlanAiProvider(): PlanAiProvider {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (key) {
    return new OpenAiPlanAi(key, process.env.OPENAI_PLAN_MODEL || undefined);
  }
  return new MockPlanAi();
}

export type { PlanAiProvider } from "@/server/ai/types";
