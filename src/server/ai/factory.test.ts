import { describe, expect, it } from "vitest";
import { createPlanAiProvider } from "@/server/ai/factory";
import { PlanAiError } from "@/server/ai/errors";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe("createPlanAiProvider", () => {
  it("uses OpenAI when a key is configured", () => {
    expect(createPlanAiProvider(env({ OPENAI_API_KEY: "k", NODE_ENV: "production" })).name).toBe("openai");
  });

  it("falls back to the mock only outside production", () => {
    expect(createPlanAiProvider(env({ NODE_ENV: "development" })).name).toBe("mock");
    expect(createPlanAiProvider(env({ NODE_ENV: "test" })).name).toBe("mock");
  });

  it("NEVER hands out an invented example plan in production without a key", () => {
    try {
      createPlanAiProvider(env({ NODE_ENV: "production" }));
      throw new Error("expected not_configured");
    } catch (e) {
      expect(e).toBeInstanceOf(PlanAiError);
      expect((e as PlanAiError).code).toBe("not_configured");
      expect((e as PlanAiError).status).toBe(503);
      expect((e as PlanAiError).message).toContain("kein Beispielplan");
    }
  });

  it("an empty/whitespace key counts as no key", () => {
    expect(() => createPlanAiProvider(env({ OPENAI_API_KEY: "   ", NODE_ENV: "production" }))).toThrow();
  });

  it("the mock can be enabled explicitly for UI testing", () => {
    expect(createPlanAiProvider(env({ NODE_ENV: "production", PLAN_AI_ALLOW_MOCK: "1" })).name).toBe("mock");
  });
});
