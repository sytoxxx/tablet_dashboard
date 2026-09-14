export type {
  SchoolJarvisAction,
  SchoolJarvisDailySummary,
  SchoolJarvisLearning,
  SchoolJarvisNextExam,
  SchoolJarvisSummaryResponse,
  SchoolJarvisToday,
} from "@/lib/integrations/school-jarvis/types";
export { validateSchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/validate";
export {
  acceptSchoolJarvisPayload,
  fetchSchoolJarvisDailySummary,
  shouldShowSchoolJarvisCard,
} from "@/lib/integrations/school-jarvis/client";
export {
  exampleFullSummary,
  exampleNoExam,
  exampleNoFlashcards,
  exampleNoRecommendation,
  exampleUnavailableCard,
  SCHOOL_JARVIS_UNAVAILABLE_MESSAGE,
} from "@/lib/integrations/school-jarvis/examples";
