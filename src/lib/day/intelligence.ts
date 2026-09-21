import type {
  Appointment,
  CalendarEvent,
  PersonProfile,
  Schedule,
  TimetableEntry,
  TodayView,
  WorkShift,
} from "@/lib/types";
import { getWeekdayKey, parseTimeToMinutes } from "@/lib/format";
import { personAvatarSrc } from "@/lib/profile/avatar";
import { getWorkShiftForDate } from "@/lib/work/schedule";
import { getNextBus } from "@/lib/day/bus";
import { buildBringItems } from "@/lib/day/bring";
import { selectMorningTasks } from "@/lib/day/tasks";
import { resolveFocusMoment, toIsoDate } from "@/lib/day/tomorrow";
import {
  blocksFromTimetable,
  blocksFromWorkShift,
  resolveDayFlow,
  type DayFlowState,
} from "@/lib/day/schedule-flow";
import { getWeatherProvider } from "@/lib/day/weather";

export type MonthHighlight = {
  isoDate: string;
  label: string;
};

export type DayIntelligenceView = TodayView & {
  focusIsoDate: string;
  focusIsTomorrow: boolean;
  dayFlow: DayFlowState;
  importantTasks: ReturnType<typeof selectMorningTasks>;
  monthHighlights: MonthHighlight[];
  displayPrefs: PersonProfile["displayPrefs"];
};

export function getAppointmentsForDate(
  appointments: Appointment[],
  date: Date,
): CalendarEvent[] {
  const key = getWeekdayKey(date);
  const iso = toIsoDate(date);
  return appointments
    .filter((a) => {
      if (a.date) return a.date === iso;
      if (a.weekday) return a.weekday === key;
      return true;
    })
    .map((a) => ({ time: a.time, title: a.title }))
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
}

function schoolTimetable(
  schedule: Extract<Schedule, { type: "school" }>,
  date: Date,
): TimetableEntry[] {
  const day = schedule.week[getWeekdayKey(date)];
  return (day?.lessons ?? []).map((l) => ({
    time: l.time,
    subject: l.subject,
    room: l.room,
  }));
}

function personalTimetable(
  schedule: Extract<Schedule, { type: "personal" }>,
  date: Date,
): TimetableEntry[] {
  const day = schedule.week[getWeekdayKey(date)];
  return (day?.blocks ?? []).map((b) => ({
    time: b.time,
    subject: b.title,
    room: b.place,
  }));
}

function monthHighlightsFor(
  person: PersonProfile,
  anchor: Date,
): MonthHighlight[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const highlights: MonthHighlight[] = [];

  for (const appt of person.appointments) {
    if (appt.date) {
      const [y, m] = appt.date.split("-").map(Number);
      if (y === year && m === month + 1) {
        highlights.push({ isoDate: appt.date, label: appt.title });
      }
      continue;
    }
    if (!appt.weekday) continue;
    // Mark matching weekdays in the visible month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (getWeekdayKey(date) === appt.weekday) {
        highlights.push({ isoDate: toIsoDate(date), label: appt.title });
      }
    }
  }

  return highlights;
}

export function buildDayIntelligence(
  person: PersonProfile,
  wallNow: Date = new Date(),
): DayIntelligenceView {
  const focus = resolveFocusMoment(wallNow);
  const focusDate = focus.focusDate;

  let timetable: TimetableEntry[] = [];
  let workShift: WorkShift | null = null;

  if (person.schedule.type === "school") {
    timetable = schoolTimetable(person.schedule, focusDate);
  } else if (person.schedule.type === "personal") {
    timetable = personalTimetable(person.schedule, focusDate);
  } else {
    workShift = getWorkShiftForDate(person, focusDate);
  }

  const blocks =
    person.schedule.type === "work"
      ? blocksFromWorkShift(workShift)
      : blocksFromTimetable(timetable);

  // For tomorrow-focus evening mode, treat flow against start-of-focus-day morning
  // so we show “next” as tomorrow’s first block, not “done”.
  const flowNow = focus.isTomorrowFocus
    ? new Date(
        focusDate.getFullYear(),
        focusDate.getMonth(),
        focusDate.getDate(),
        5,
        0,
        0,
        0,
      )
    : wallNow;

  const dayFlow = resolveDayFlow(blocks, flowNow);
  const weather = getWeatherProvider().getWeather({
    personId: person.id,
    date: focusDate,
    fallback: person.weather,
  });

  return {
    id: person.id,
    scheduleType: person.schedule.type,
    displayName: person.name,
    avatar: person.avatar,
    avatarImageUrl: personAvatarSrc(person),
    hint: person.hint,
    greeting: person.greeting,
    accent: person.accent,
    weekdayKey: focus.focusWeekdayKey,
    timetable,
    workShift,
    mitnehmen: buildBringItems(person, focusDate),
    nextBus: getNextBus(person.busStop, wallNow),
    busStopName: person.busStop?.name ?? null,
    weather,
    calendar: getAppointmentsForDate(person.appointments, focusDate),
    tasks: person.tasks,
    focusIsoDate: toIsoDate(focusDate),
    focusIsTomorrow: focus.isTomorrowFocus,
    dayFlow,
    importantTasks: selectMorningTasks(person.tasks),
    monthHighlights: monthHighlightsFor(person, focusDate),
    displayPrefs: {
      showBus: person.displayPrefs?.showBus ?? true,
      showWeather: person.displayPrefs?.showWeather ?? true,
      showCalendar: person.displayPrefs?.showCalendar ?? true,
      showTasks: person.displayPrefs?.showTasks ?? true,
    },
  };
}

/** @deprecated use buildDayIntelligence — kept for Phase 2/3 call sites */
export function buildTodayView(person: PersonProfile, now: Date = new Date()) {
  return buildDayIntelligence(person, now);
}

export function getTodayAppointments(
  appointments: Appointment[],
  date: Date = new Date(),
) {
  return getAppointmentsForDate(appointments, date);
}

export { getNextBus } from "@/lib/day/bus";
export { buildBringItems } from "@/lib/day/bring";
export {
  getCurrentOrNextLesson,
} from "@/lib/day/legacy-lesson";
