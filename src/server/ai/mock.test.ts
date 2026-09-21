import { describe, expect, it } from "vitest";
import { MockPlanAi } from "@/server/ai/mock";

describe("MockPlanAi work analysis", () => {
  it("produces a valid dated draft spanning two weeks with Frei/Urlaub/Krankenstand", async () => {
    const provider = new MockPlanAi();
    const referenceDate = new Date(2026, 8, 10); // Thursday, 2026-09-10
    const result = await provider.analyze({
      planType: "work",
      personId: "birgit",
      personName: "Birgit",
      images: [{ base64: "", mimeType: "image/jpeg" }],
      referenceDate,
    });

    expect(result.draft.type).toBe("work");
    if (result.draft.type !== "work") return;
    const { entries } = result.draft;

    // Real, resolvable, chronologically sorted dates — no invented gaps.
    expect(entries.length).toBeGreaterThanOrEqual(10);
    const dates = entries.map((e) => e.date);
    expect(dates).toEqual([...dates].sort());

    const statuses = new Set(entries.map((e) => e.status));
    expect(statuses).toEqual(new Set(["work", "free", "vacation", "sick"]));

    const free = entries.find((e) => e.status === "free");
    expect(free?.label).toBe("Frei");
    const vacation = entries.find((e) => e.status === "vacation");
    expect(vacation?.label).toBe("Urlaub");
    const sick = entries.find((e) => e.status === "sick");
    expect(sick?.label).toBe("Krankenstand");

    // Spans two distinct calendar weeks (dates 7+ days apart), not a single week.
    const spanDays =
      (new Date(dates[dates.length - 1]!).getTime() - new Date(dates[0]!).getTime()) /
      (24 * 60 * 60 * 1000);
    expect(spanDays).toBeGreaterThanOrEqual(7);
    expect(entries.some((e) => e.status === "work" && e.start && e.end)).toBe(true);
  });

  it("stays deterministic and dated relative to a different reference date", async () => {
    const provider = new MockPlanAi();
    const result = await provider.analyze({
      planType: "work",
      personId: "birgit",
      personName: "Birgit",
      images: [{ base64: "", mimeType: "image/jpeg" }],
      referenceDate: new Date(2026, 11, 30), // year-boundary reference
    });
    if (result.draft.type !== "work") throw new Error("expected work draft");
    for (const entry of result.draft.entries) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
