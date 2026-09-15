import type { BeanScanAiProvider } from "@/lib/coffee/scan";
import { MockBeanScanAi } from "@/server/ai/bean-mock";
import { OpenAiBeanScanAi } from "@/server/ai/bean-openai";

export function createBeanScanAiProvider(): BeanScanAiProvider {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (key) {
    return new OpenAiBeanScanAi(key, process.env.OPENAI_PLAN_MODEL || undefined);
  }
  return new MockBeanScanAi();
}
