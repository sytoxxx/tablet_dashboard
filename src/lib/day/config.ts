/**
 * Central day-intelligence thresholds.
 * Evening after this local hour → focus shifts to tomorrow’s plan.
 */
export const DAY_CONFIG = {
  /** Local hour (0–23) when evening “tomorrow” mode begins. */
  eveningTomorrowHour: 18,
  /** Assumed length of a school/personal block when no end time exists. */
  defaultBlockDurationMin: 45,
  /** Tick for day-logic recalculation (clock UI ticks separately). */
  dayLogicIntervalMs: 30_000,
} as const;
