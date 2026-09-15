import type { PersonId } from "@/lib/types";
import type { SchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/types";

/** Example payloads for contract tests & docs — not live School Jarvis data. */

export function exampleFullSummary(
  personId: PersonId = "levi",
  focusDate = "2026-09-14",
): SchoolJarvisDailySummary {
  return {
    available: true,
    personId,
    focusDate,
    nextExam: {
      subject: "Mathematik",
      date: "2026-09-22",
      daysUntil: 8,
    },
    today: {
      recommendedStudyMinutes: 25,
      recommendation: "Kurz Bruchrechnen wiederholen.",
    },
    learning: {
      weakTopics: ["Brüche", "Gleichungen"],
      dueFlashcards: 12,
    },
    action: {
      label: "Jetzt lernen",
      target: "recommended-learning",
    },
  };
}

export function exampleNoExam(
  personId: PersonId = "levi",
  focusDate = "2026-09-14",
): SchoolJarvisDailySummary {
  return {
    ...exampleFullSummary(personId, focusDate),
    nextExam: null,
  };
}

export function exampleNoRecommendation(
  personId: PersonId = "levi",
  focusDate = "2026-09-14",
): SchoolJarvisDailySummary {
  return {
    ...exampleFullSummary(personId, focusDate),
    today: null,
    action: null,
  };
}

export function exampleNoFlashcards(
  personId: PersonId = "levi",
  focusDate = "2026-09-14",
): SchoolJarvisDailySummary {
  return {
    ...exampleFullSummary(personId, focusDate),
    learning: {
      weakTopics: ["Brüche"],
      dueFlashcards: 0,
    },
  };
}

export function exampleUnavailableCard(): SchoolJarvisDailySummary {
  return {
    available: false,
    personId: "levi",
    focusDate: "2026-09-14",
    nextExam: null,
    today: null,
    learning: null,
    action: null,
  };
}

export const SCHOOL_JARVIS_UNAVAILABLE_MESSAGE =
  "School Jarvis momentan nicht verfügbar.";
