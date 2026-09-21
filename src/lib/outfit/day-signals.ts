/**
 * Detect day signals for outfit rules from schedule + appointments.
 * Optional text hints (e.g. School Jarvis labels) reinforce detection —
 * School Jarvis itself is not modified.
 */
import type { PersonProfile } from "@/lib/types";
import { getWeekdayKey } from "@/lib/format";
import { getWorkShiftForDate } from "@/lib/work/schedule";
import type { DayOutfitSignals } from "@/lib/outfit/types";

const WORKSHOP_RE =
  /\b(werkstatt|werkstätte|werkstätten|werkstättenunterricht|fertigung|laborpraktikum)\b/i;

const PRESENTATION_RE =
  /\b(referat|präsentation|praesentation|vortrag|presentation)\b/i;

export function textLooksLikeWorkshop(text: string): boolean {
  return WORKSHOP_RE.test(text);
}

export function textLooksLikePresentation(text: string): boolean {
  return PRESENTATION_RE.test(text);
}

export function collectDayTexts(
  person: PersonProfile,
  date: Date,
): { subjects: string[]; titles: string[] } {
  const key = getWeekdayKey(date);
  const subjects: string[] = [];
  const titles: string[] = [];

  const schedule = person.schedule;
  if (schedule.type === "school") {
    for (const lesson of schedule.week[key]?.lessons ?? []) {
      subjects.push(lesson.subject);
      if (lesson.room) subjects.push(lesson.room);
    }
  } else if (schedule.type === "work") {
    // The real dated entry (from an uploaded roster) always wins over the
    // recurring weekday pattern — same single source of truth as everywhere else.
    const shift = getWorkShiftForDate(person, date);
    if (shift) {
      titles.push(shift.label);
      if (shift.notes) titles.push(shift.notes);
    }
  } else {
    for (const block of schedule.week[key]?.blocks ?? []) {
      titles.push(block.title);
    }
  }

  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  for (const appt of person.appointments) {
    if (appt.date && appt.date !== iso) continue;
    if (appt.weekday && appt.weekday !== key) continue;
    titles.push(appt.title);
  }

  return { subjects, titles };
}

export function detectDayOutfitSignals(input: {
  person: PersonProfile;
  date: Date;
  extraHints?: string[] | null;
}): DayOutfitSignals {
  const { subjects, titles } = collectDayTexts(input.person, input.date);
  const hints = input.extraHints?.filter(Boolean) ?? [];
  const all = [...subjects, ...titles, ...hints];

  const workshopDay = all.some(textLooksLikeWorkshop);
  const presentationHit = all.find(textLooksLikePresentation) ?? null;
  const schoolDay =
    input.person.schedule.type === "school" && subjects.length > 0;
  // The real dated entry always wins over the recurring weekday pattern —
  // a day explicitly off (Frei/Urlaub/Krankenstand) must never read as a work day.
  const workDay =
    input.person.schedule.type === "work" &&
    getWorkShiftForDate(input.person, input.date) !== null;

  return {
    workshopDay,
    presentation: Boolean(presentationHit),
    presentationLabel: presentationHit,
    schoolDay,
    workDay,
    lessonSubjects: subjects,
    appointmentTitles: titles,
  };
}
