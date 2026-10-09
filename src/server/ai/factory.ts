import type { PlanAiProvider } from "@/server/ai/types";
import { MockPlanAi } from "@/server/ai/mock";
import { OpenAiPlanAi } from "@/server/ai/openai";
import { notConfiguredError } from "@/server/ai/errors";

/**
 * Without an API key there is no real recognition. In production that must
 * be an honest error: the mock returns an invented example roster, which a
 * user could otherwise save as their real plan. The mock is only available
 * for local development, or when explicitly enabled with PLAN_AI_ALLOW_MOCK=1
 * (used for UI testing).
 */
export function createPlanAiProvider(env: NodeJS.ProcessEnv = process.env): PlanAiProvider {
  const key = env.OPENAI_API_KEY?.trim();
  if (key) {
    return new OpenAiPlanAi(key, env.OPENAI_PLAN_MODEL || undefined);
  }
  if (env.PLAN_AI_ALLOW_MOCK === "1" || env.NODE_ENV !== "production") {
    return new MockPlanAi();
  }
  throw notConfiguredError();
}

export type { PlanAiProvider } from "@/server/ai/types";
