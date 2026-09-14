/**
 * Compatibility barrel — day intelligence lives under src/lib/day/.
 */
export {
  buildDayIntelligence,
  buildTodayView,
  getAppointmentsForDate,
  getTodayAppointments,
  getNextBus,
  buildBringItems,
  getCurrentOrNextLesson,
} from "@/lib/day/intelligence";

export type { DayIntelligenceView, MonthHighlight } from "@/lib/day/intelligence";
