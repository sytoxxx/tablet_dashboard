import type {
  Appointment,
  BusInfo,
  BusStop,
  CalendarEvent,
  PersonProfile,
  Schedule,
  TimetableEntry,
  TodayView,
  WorkShift,
} from "@/lib/types";
import {
  getMinutesSinceMidnight,
  getWeekdayKey,
  parseTimeToMinutes,
} from "@/lib/format";

export function getTodayAppointments(
  appointments: Appointment[],
  date: Date = new Date(),
): CalendarEvent[] {
  const key = getWeekdayKey(date);
  const iso = date.toISOString().slice(0, 10);
  return appointments
    .filter((a) => {
      if (a.date) return a.date === iso;
      if (a.weekday) return a.weekday === key;
      return true;
    })
    .map((a) => ({ time: a.time, title: a.title }))
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
}

export function getNextBus(
  stop: BusStop | null,
  now: Date = new Date(),
): BusInfo | null {
  if (!stop || stop.departures.length === 0) return null;
  const current = getMinutesSinceMidnight(now);
  const upcoming = [...stop.departures]
    .map((d) => ({ ...d, minutes: parseTimeToMinutes(d.time) }))
    .filter((d) => d.minutes >= current)
    .sort((a, b) => a.minutes - b.minutes);

  const next = upcoming[0];
  if (!next) return null;

  return {
    line: next.line,
    destination: next.destination,
    departure: next.time,
    stopName: stop.name,
    minutesUntil: next.minutes - current,
  };
}

export function buildBringItems(person: PersonProfile, date: Date = new Date()): string[] {
  const key = getWeekdayKey(date);
  const items = new Set<string>(person.defaultBringItems);
  const schedule = person.schedule;

  if (schedule.type === "school") {
    const day = schedule.week[key];
    day?.lessons.forEach((lesson) => lesson.bringItems?.forEach((i) => items.add(i)));
  } else if (schedule.type === "work") {
    const day = schedule.week[key];
    day?.bringItems?.forEach((i) => items.add(i));
  } else {
    const day = schedule.week[key];
    day?.blocks.forEach((block) => block.bringItems?.forEach((i) => items.add(i)));
  }

  return [...items];
}

function schoolTimetable(schedule: Extract<Schedule, { type: "school" }>, date: Date): TimetableEntry[] {
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

function workShiftFor(
  schedule: Extract<Schedule, { type: "work" }>,
  date: Date,
): WorkShift | null {
  const day = schedule.week[getWeekdayKey(date)];
  if (!day) return null;
  return {
    label: day.label,
    start: day.start,
    end: day.end,
    location: day.location,
    notes: day.notes,
  };
}

export function buildTodayView(person: PersonProfile, now: Date = new Date()): TodayView {
  const weekdayKey = getWeekdayKey(now);
  let timetable: TimetableEntry[] = [];
  let workShift: WorkShift | null = null;

  if (person.schedule.type === "school") {
    timetable = schoolTimetable(person.schedule, now);
  } else if (person.schedule.type === "personal") {
    timetable = personalTimetable(person.schedule, now);
  } else {
    workShift = workShiftFor(person.schedule, now);
  }

  return {
    id: person.id,
    scheduleType: person.schedule.type,
    displayName: person.name,
    avatar: person.avatar,
    hint: person.hint,
    greeting: person.greeting,
    accent: person.accent,
    weekdayKey,
    timetable,
    workShift,
    mitnehmen: buildBringItems(person, now),
    nextBus: getNextBus(person.busStop, now),
    busStopName: person.busStop?.name ?? null,
    weather: person.weather,
    calendar: getTodayAppointments(person.appointments, now),
    tasks: person.tasks,
  };
}

export function getCurrentOrNextLesson(
  entries: TimetableEntry[],
  now: Date = new Date(),
): { lesson: TimetableEntry; status: "now" | "next" | "done" } | null {
  if (entries.length === 0) return null;
  const current = getMinutesSinceMidnight(now);
  for (let i = 0; i < entries.length; i++) {
    const start = parseTimeToMinutes(entries[i].time);
    const nextStart =
      i + 1 < entries.length ? parseTimeToMinutes(entries[i + 1].time) : start + 45;
    if (current >= start && current < nextStart) {
      return { lesson: entries[i], status: "now" };
    }
    if (current < start) {
      return { lesson: entries[i], status: "next" };
    }
  }
  return { lesson: entries[entries.length - 1], status: "done" };
}
