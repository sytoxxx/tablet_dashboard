/**
 * Work-schedule helpers for morning dashboards.
 * Does not invent shifts — only reads PersonProfile.schedule.
 */
import type {
  PersonProfile,
  Schedule,
  WeekdayKey,
  WorkDayStatus,
  WorkShift,
  WorkShiftDay,
} from "@/lib/types";
import { getWeekdayKey, WEEKDAY_ORDER } from "@/lib/format";
import { toIsoDate } from "@/lib/day/tomorrow";

type WorkSchedule = Extract<Schedule, { type: "work" }>;

const SHORT_DAY: Record<WeekdayKey, string> = {
  mon: "Mo",
  tue: "Di",
  wed: "Mi",
  thu: "Do",
  fri: "Fr",
  sat: "Sa",
  sun: "So",
};

export type WorkWeekDayStatus = "work" | "free" | "vacation" | "sick" | "other" | "unknown";

export type WorkWeekDayGlance = {
  day: WeekdayKey;
  shortLabel: string;
  status: WorkWeekDayStatus;
  /** Arbeit | Frei | Urlaub | Krankenstand | Keine Daten */
  statusLabel: string;
  /** e.g. 08:00–16:00 when both times exist */
  hours: string | null;
  isToday: boolean;
};

const STATUS_LABEL: Record<Exclude<WorkDayStatus, "work">, string> = {
  free: "Frei",
  vacation: "Urlaub",
  sick: "Krankenstand",
  other: "Sonstiges",
};

/**
 * Non-work status for a day — from the explicit status field when present,
 * otherwise (older / manually-typed plans) inferred from the label text.
 * Never guesses vacation/sick from a bare label — only an explicit "frei" match.
 */
function nonWorkStatus(day: WorkShiftDay): Exclude<WorkDayStatus, "work"> | null {
  if (day.status && day.status !== "work") return day.status;
  if (!day.status && /^\s*frei\b/i.test(day.label.trim())) return "free";
  return null;
}

function hasWorkHours(day: { start: string; end: string }): boolean {
  return Boolean(day.start?.trim() && day.end?.trim());
}

/**
 * Single source of truth for "what happens on this real calendar date":
 * a dated `entries` row (real, uploaded roster) always wins when present for
 * that exact ISO date; otherwise falls back to the recurring `week` pattern
 * (manually configured baseline); otherwise there is simply no data.
 * Never invents a status for a date neither source covers.
 */
export function resolveWorkDayForDate(
  schedule: WorkSchedule,
  date: Date,
): { day: WorkShiftDay; source: "entries" | "week" } | null {
  const iso = toIsoDate(date);
  const dated = schedule.entries?.find((e) => e.date === iso);
  if (dated) {
    const { date: _d, ...day } = dated;
    void _d;
    return { day, source: "entries" };
  }
  const week = schedule.week[getWeekdayKey(date)];
  if (!week) return null;
  return { day: week, source: "week" };
}

/**
 * Mon→Sun glance for the calendar week containing `today`.
 * Missing day → Keine Daten (never invent a status).
 * Explicit status (or legacy "Frei…" label) → Frei / Urlaub / Krankenstand.
 * Dated `entries` take priority over the recurring `week` pattern per day.
 */
export function buildWorkWeekGlance(
  schedule: WorkSchedule | null | undefined,
  today: Date,
): WorkWeekDayGlance[] {
  const todayKey = getWeekdayKey(today);
  const monday = new Date(today);
  const mondayOffset = (today.getDay() + 6) % 7; // 0=Mon..6=Sun
  monday.setDate(monday.getDate() - mondayOffset);

  return WEEKDAY_ORDER.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const resolved = schedule ? resolveWorkDayForDate(schedule, date) : null;

    if (!resolved) {
      return {
        day,
        shortLabel: SHORT_DAY[day],
        status: "unknown" as const,
        statusLabel: "Keine Daten",
        hours: null,
        isToday: day === todayKey,
      };
    }
    const entry = resolved.day;
    const nonWork = nonWorkStatus(entry);
    if (nonWork) {
      return {
        day,
        shortLabel: SHORT_DAY[day],
        status: nonWork,
        statusLabel: STATUS_LABEL[nonWork],
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

/**
 * The shift for a real calendar date — null on a day with no data AND on an
 * explicit non-work day (Frei/Urlaub/Krankenstand). Callers gate "is working
 * today" on this, so a day off must never surface as a truthy shift.
 */
export function getWorkShiftForDate(
  person: PersonProfile,
  date: Date,
): WorkShift | null {
  if (person.schedule.type !== "work") return null;
  const resolved = resolveWorkDayForDate(person.schedule, date);
  if (!resolved) return null;
  const day = resolved.day;
  if (nonWorkStatus(day)) return null;
  return {
    label: day.label,
    start: day.start,
    end: day.end,
    location: day.location,
    notes: day.notes,
  };
}

/** True when there is no shift on that date — either no data at all, or an explicit day off. */
export function isFreeWorkDay(person: PersonProfile, date: Date): boolean {
  if (person.schedule.type !== "work") return false;
  const resolved = resolveWorkDayForDate(person.schedule, date);
  if (!resolved) return true;
  return Boolean(nonWorkStatus(resolved.day));
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
