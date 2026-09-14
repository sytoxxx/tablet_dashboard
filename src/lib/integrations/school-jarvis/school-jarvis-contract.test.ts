import { describe, expect, it } from "vitest";
import {
  SCHOOL_JARVIS_UNAVAILABLE_MESSAGE,
  exampleFullSummary,
  exampleNoExam,
  exampleNoFlashcards,
  exampleNoRecommendation,
  exampleUnavailableCard,
} from "./examples";
import {
  acceptSchoolJarvisPayload,
  fetchSchoolJarvisDailySummary,
  shouldShowSchoolJarvisCard,
} from "./client";
import { validateSchoolJarvisDailySummary } from "./validate";
import type { SchoolJarvisDailySummary } from "./types";

describe("School Jarvis integration contract", () => {
  it("accepts a full valid summary payload", () => {
    const result = validateSchoolJarvisDailySummary(exampleFullSummary("levi"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.available).toBe(true);
    expect(result.summary.personId).toBe("levi");
    expect(result.summary.nextExam?.subject).toBe("Mathematik");
    expect(result.summary.today?.recommendedStudyMinutes).toBe(25);
    expect(result.summary.learning?.weakTopics).toEqual(["Brüche", "Gleichungen"]);
    expect(result.summary.learning?.dueFlashcards).toBe(12);
    expect(result.summary.action?.label).toBe("Jetzt lernen");
    expect(result.summary.action?.target).toBe("recommended-learning");
  });

  it("accepts a summary with no exam", () => {
    const result = validateSchoolJarvisDailySummary(exampleNoExam("levi"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.nextExam).toBeNull();
  });

  it("accepts a summary with no learning recommendation", () => {
    const result = validateSchoolJarvisDailySummary(
      exampleNoRecommendation("levi"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.today).toBeNull();
    expect(result.summary.action).toBeNull();
  });

  it("accepts a summary with no due flashcards", () => {
    const result = validateSchoolJarvisDailySummary(exampleNoFlashcards("levi"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.learning?.dueFlashcards).toBe(0);
  });

  it("models School Jarvis unavailable without fake learning data", () => {
    const unavailable = exampleUnavailableCard();
    expect(unavailable.available).toBe(false);
    expect(unavailable.nextExam).toBeNull();
    expect(unavailable.today).toBeNull();
    expect(unavailable.learning).toBeNull();
    expect(unavailable.action).toBeNull();

    const accepted = acceptSchoolJarvisPayload(unavailable);
    expect(accepted.ok).toBe(false);
    expect(accepted.summary).toBeNull();
    expect(shouldShowSchoolJarvisCard(accepted)).toBe(false);
    expect(SCHOOL_JARVIS_UNAVAILABLE_MESSAGE).toBe(
      "School Jarvis momentan nicht verfügbar.",
    );
  });

  it("rejects an invalid payload", () => {
    const result = validateSchoolJarvisDailySummary({
      available: true,
      personId: "levi",
      focusDate: "2026-09-14",
      nextExam: { subject: "Mathe", date: "bad-date", daysUntil: 2 },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects malformed learning and action fields", () => {
    expect(
      validateSchoolJarvisDailySummary({
        available: true,
        personId: "levi",
        focusDate: "2026-09-14",
        learning: { weakTopics: "not-an-array", dueFlashcards: 1 },
      }).ok,
    ).toBe(false);
    expect(
      validateSchoolJarvisDailySummary({
        available: true,
        personId: "levi",
        focusDate: "2026-09-14",
        action: { label: "Jetzt lernen", target: "" },
      }).ok,
    ).toBe(false);
    expect(
      validateSchoolJarvisDailySummary({
        available: true,
        personId: "levi",
        focusDate: "2026-09-14",
        today: { recommendedStudyMinutes: -5, recommendation: "x" },
      }).ok,
    ).toBe(false);
  });

  it("accepts a valid payload through the Coffee Morning adapter", () => {
    const accepted = acceptSchoolJarvisPayload(exampleFullSummary("levi"));
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(shouldShowSchoolJarvisCard(accepted)).toBe(true);
    expect(accepted.summary.action?.target).toBe("recommended-learning");
  });

  it("keeps the Jetzt lernen action opaque to Coffee Morning", () => {
    const result = validateSchoolJarvisDailySummary({
      available: true,
      personId: "levi",
      focusDate: "2026-09-14",
      nextExam: null,
      today: null,
      learning: null,
      action: { label: "Jetzt lernen", target: "recommended-learning" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.action?.label).toBe("Jetzt lernen");
    expect(result.summary.action?.target).toBe("recommended-learning");
    expect(typeof result.summary.action?.target).toBe("string");
  });

  it("supports different persons with the same contract shape", () => {
    for (const personId of ["levi", "birgit", "heidi"] as const) {
      const summary = exampleFullSummary(personId);
      const result = validateSchoolJarvisDailySummary(summary);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.summary.personId).toBe(personId);
      expect(result.summary.available).toBe(true);

      const accepted = acceptSchoolJarvisPayload(summary);
      expect(accepted.ok).toBe(true);
    }
  });

  it("stub client returns unavailable until real integration exists", async () => {
    const response = await fetchSchoolJarvisDailySummary({ personId: "levi" });
    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.unavailable).toBe(true);
    expect(response.summary).toBeNull();
    expect(response.message).toBe(SCHOOL_JARVIS_UNAVAILABLE_MESSAGE);
    expect(shouldShowSchoolJarvisCard(response)).toBe(false);
  });

  it("keeps the summary model intentionally small", () => {
    const keys = Object.keys(exampleFullSummary()).sort();
    expect(keys).toEqual([
      "action",
      "available",
      "focusDate",
      "learning",
      "nextExam",
      "personId",
      "today",
    ]);
  });

  it("does not invent learning data when validation fails", () => {
    const accepted = acceptSchoolJarvisPayload({ available: "yes" });
    expect(accepted.ok).toBe(false);
    if (accepted.ok) return;
    expect(accepted.summary).toBeNull();
    expect(accepted.message).toBe(SCHOOL_JARVIS_UNAVAILABLE_MESSAGE);
  });

  it("allows null optional blocks without extra fields", () => {
    const summary: SchoolJarvisDailySummary = {
      available: true,
      personId: "heidi",
      focusDate: "2026-09-14",
      nextExam: null,
      today: null,
      learning: null,
      action: null,
    };
    expect(validateSchoolJarvisDailySummary(summary).ok).toBe(true);
  });
});
