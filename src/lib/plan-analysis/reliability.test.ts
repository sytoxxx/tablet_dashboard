import { describe, expect, it } from "vitest";
import { assessReliability } from "@/lib/plan-analysis/reliability";
import type { AnalyzedWorkEntry, PlanAnalysisResult } from "@/lib/plan-analysis/types";

function entry(overrides: Partial<AnalyzedWorkEntry> = {}): AnalyzedWorkEntry {
  return {
    date: "2026-09-21",
    label: "Frühschicht",
    start: "06:00",
    end: "14:00",
    location: "X",
    status: "work",
    ...overrides,
  };
}

function result(entries: AnalyzedWorkEntry[], confidence = 0.8): PlanAnalysisResult {
  return {
    mode: "work",
    source: "ai",
    confidence,
    draft: { type: "work", entries },
    uncertainties: [],
    warnings: [],
  };
}

describe("assessReliability", () => {
  it("is reliable when everything read cleanly", () => {
    const r = result([entry(), entry({ date: "2026-09-22" }), entry({ date: "2026-09-23" })], 0.9);
    expect(assessReliability(r)).toEqual({ reliable: true });
  });

  it("does NOT reject on a single low overall confidence value alone", () => {
    // Ten clean entries, but the model reported low self-confidence overall —
    // per the explicit requirement, a lone low confidence number must not
    // reject the whole photo when the actual data came out fine.
    const entries = Array.from({ length: 10 }, (_, i) =>
      entry({ date: `2026-09-${String(i + 1).padStart(2, "0")}` }),
    );
    const r = result(entries, 0.2);
    expect(assessReliability(r)).toEqual({ reliable: true });
  });

  it("tolerates a single unreadable entry among many good ones", () => {
    const entries = [
      ...Array.from({ length: 9 }, (_, i) =>
        entry({ date: `2026-09-${String(i + 1).padStart(2, "0")}` }),
      ),
      entry({ date: "2026-09-10", timeUnclear: true, uncertain: true, start: "", end: "" }),
    ];
    const r = result(entries, 0.75);
    expect(assessReliability(r)).toEqual({ reliable: true });
  });

  it("rejects when more than half the entries have a genuine hard problem", () => {
    const entries = [
      entry({ date: "2026-09-01" }),
      entry({ date: "2026-09-02", timeUnclear: true, uncertain: true, start: "", end: "" }),
      entry({ date: "2026-09-03", unresolvedCode: true, uncertain: true, code: "X" }),
      entry({ date: "2026-09-04", timeUnclear: true, uncertain: true, start: "", end: "" }),
    ];
    const r = result(entries, 0.7);
    const assessment = assessReliability(r);
    expect(assessment).toMatchObject({ reliable: false });
    if (assessment.reliable) return;
    expect(assessment.reason).toContain("nicht eindeutig lesbar");
  });

  it("rejects when every single entry is flagged uncertain, even without a low confidence number", () => {
    const entries = [
      entry({ date: "2026-09-01", uncertain: true }),
      entry({ date: "2026-09-02", uncertain: true }),
      entry({ date: "2026-09-03", uncertain: true }),
    ];
    const r = result(entries, 0.6);
    expect(assessReliability(r).reliable).toBe(false);
  });

  it("rejects on the COMBINATION of very low confidence and at least one hard problem", () => {
    const entries = [
      entry({ date: "2026-09-01" }),
      entry({ date: "2026-09-02" }),
      entry({ date: "2026-09-03", timeUnclear: true, uncertain: true, start: "", end: "" }),
    ];
    const r = result(entries, 0.15);
    expect(assessReliability(r).reliable).toBe(false);
  });

  it("is reliable when there simply are no entries yet (an empty draft is rejected earlier in validation, not here)", () => {
    const r = result([], 0.1);
    expect(assessReliability(r)).toEqual({ reliable: true });
  });

  it("never assesses school-mode plans (out of scope for this gate)", () => {
    const r: PlanAnalysisResult = {
      mode: "school",
      source: "ai",
      confidence: 0.05,
      draft: { type: "school", week: {} },
      uncertainties: [],
      warnings: [],
    };
    expect(assessReliability(r)).toEqual({ reliable: true });
  });
});
