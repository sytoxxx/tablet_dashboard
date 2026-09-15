/**
 * Work-schedule helpers for morning dashboards.
 * Does not invent shifts — only reads PersonProfile.schedule.
 */
import type {
  PersonProfile,
  WeekdayKey,
  WorkShift,
  WorkShiftDay,
} from "@/lib/types";
import { getWeekdayKey, WEEKDAY_ORDER } from "@/lib/format";

const SHORT_DAY: Record<WeekdayKey, string> = {
  mon: "Mo",
  tue: "Di",
  wed: "Mi",
  thu: "Do",
  fri: "Fr",
  sat: "Sa",
  sun: "So",
};

export type WorkWeekDayStatus = "work" | "free" | "unknown";

export type WorkWeekDayGlance = {
  day: WeekdayKey;
  shortLabel: string;
  status: WorkWeekDayStatus;
  /** Arbeit | Frei | Keine Daten */
  statusLabel: string;
  /** e.g. 08:00–16:00 when both times exist */
  hours: string | null;
  isToday: boolean;
};

function isExplicitFree(day: WorkShiftDay): boolean {
  return /^\s*frei\b/i.test(day.label.trim());
}

function hasWorkHours(day: WorkShiftDay): boolean {
  return Boolean(day.start?.trim() && day.end?.trim());
}

/**
 * Mon→Sun glance from existing work week keys only.
 * Missing day → Keine Daten (never invent Frei).
 * Explicit label "Frei…" → Frei.
 */
export function buildWorkWeekGlance(
  week: Partial<Record<WeekdayKey, WorkShiftDay>> | null | undefined,
  today: Date,
): WorkWeekDayGlance[] {
  const todayKey = getWeekdayKey(today);
  return WEEKDAY_ORDER.map((day) => {
    const entry = week?.[day];
    if (!entry) {
      return {
        day,
        shortLabel: SHORT_DAY[day],
        status: "unknown" as const,
        statusLabel: "Keine Daten",
        hours: null,
        isToday: day === todayKey,
      };
    }
    if (isExplicitFree(entry)) {
      return {
        day,
        shortLabel: SHORT_DAY[day],
        status: "free" as const,
        statusLabel: "Frei",
        hours: null,
        isToday: day === todayKey,
      };
    }
    return {
      day,
      shortLabel: SHORT_DAY[day],
      status: "work" as const,
      statusLabel: "Arbeit",
      hours: hasWorkHours(entry)
        ? `${entry.start.trim()}–${entry.end.trim()}`
        : null,
      isToday: day === todayKey,
    };
  });
}

export function getWorkShiftForDate(
  person: PersonProfile,
  date: Date,
): WorkShift | null {
  if (person.schedule.type !== "work") return null;
  const key = getWeekdayKey(date);
  const day = person.schedule.week[key];
  if (!day) return null;
  return {
    label: day.label,
    start: day.start,
    end: day.end,
    location: day.location,
    notes: day.notes,
  };
}

export function isFreeWorkDay(person: PersonProfile, date: Date): boolean {
  if (person.schedule.type !== "work") return false;
  return !person.schedule.week[getWeekdayKey(date)];
}

export function workShiftDayToView(day: WorkShiftDay): WorkShift {
  return {
    label: day.label,
    start: day.start,
    end: day.end,
    location: day.location,
    notes: day.notes,
  };
}

export function listConfiguredWorkDays(
  person: PersonProfile,
): Array<{ day: WeekdayKey; shift: WorkShiftDay }> {
  if (person.schedule.type !== "work") return [];
  return (
    Object.entries(person.schedule.week) as Array<[WeekdayKey, WorkShiftDay]>
  ).map(([day, shift]) => ({ day, shift }));
}
