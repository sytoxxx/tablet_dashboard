import { describe, expect, it } from "vitest";
import { validatePlanAnalysis } from "@/lib/plan-analysis/validate";

const school = (lessons: unknown[]) => ({
  mode: "school",
  source: "ai",
  confidence: 0.8,
  warnings: [],
  uncertainties: [],
  draft: { type: "school", week: { mon: { lessons } } },
});

describe("school timetable validation", () => {
  it("a timetable that prints no rooms is not 'unsicher' — a missing room is optional info", () => {
    const r = validatePlanAnalysis(school([{ id: "a", time: "08:00", subject: "Mathematik" }]), "school");
    if (!r.ok || r.result.draft.type !== "school") throw new Error("expected school draft");
    expect(r.result.draft.week.mon!.lessons[0]).toMatchObject({ room: "", uncertain: false });
    expect(r.result.uncertainties).toHaveLength(0);
  });

  it("the model's own uncertainty still blocks silent saving", () => {
    const r = validatePlanAnalysis(
      school([{ id: "a", time: "08:00", subject: "Physik", room: "B1", uncertain: true }]),
      "school",
    );
    if (!r.ok || r.result.draft.type !== "school") throw new Error();
    expect(r.result.draft.week.mon!.lessons[0]!.uncertain).toBe(true);
  });

  it("drops lessons without a start time or subject instead of inventing them", () => {
    const r = validatePlanAnalysis(
      school([
        { id: "a", time: "", subject: "Mathematik" },
        { id: "b", time: "09:00", subject: "" },
        { id: "c", time: "10:00", subject: "Deutsch", room: "A1" },
      ]),
      "school",
    );
    if (!r.ok || r.result.draft.type !== "school") throw new Error();
    expect(r.result.draft.week.mon!.lessons.map((l) => l.subject)).toEqual(["Deutsch"]);
  });

  it("rejects a draft with no usable lesson at all", () => {
    expect(validatePlanAnalysis(school([{ id: "a", time: "", subject: "" }]), "school").ok).toBe(false);
  });
});
