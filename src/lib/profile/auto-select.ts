/**
 * Automatic profile pick for the "Wer bist du?" home screen — based only on
 * real, already-stored schedule data (Birgit's concrete dated work plan,
 * Levi's real weekly school timetable, Heidi's work status). Never guesses;
 * a genuinely ambiguous morning falls back to the manual picker.
 */
import type { PersonId, PersonProfile } from "@/lib/types";
import { getViennaMinutesSinceMidnight, getWeekdayKey, viennaWallClockDate } from "@/lib/format";
import { getWorkShiftForDate } from "@/lib/work/schedule";

/** Levi auto-selects from 07:00 Vienna when he has real school today. */
export const LEVI_AUTO_FROM_MINUTES = 7 * 60;
/** Heidi auto-selects from 07:30 Vienna when Levi's school doesn't apply today. */
export const HEIDI_AUTO_FROM_MINUTES = 7 * 60 + 30;

function hasSchoolToday(person: PersonProfile | undefined, viennaNow: Date): boolean {
  if (!person || person.schedule.type !== "school") return false;
  const day = person.schedule.week[getWeekdayKey(viennaNow)];
  return Boolean(day?.lessons?.length);
}

function worksToday(person: PersonProfile | undefined, viennaNow: Date): boolean {
  if (!person || person.schedule.type !== "work") return false;
  return Boolean(getWorkShiftForDate(person, viennaNow));
}

/**
 * Resolves who the home screen should auto-open for, or null to show the
 * normal "Wer bist du?" picker (ambiguous, nobody due yet, or a genuine
 * clash between Levi and Heidi).
 */
export function resolveAutoProfile(
  persons: PersonProfile[],
  now: Date = new Date(),
): PersonId | null {
  const viennaNow = viennaWallClockDate(now);
  const minutes = getViennaMinutesSinceMidnight(now);

  const levi = persons.find((p) => p.id === "levi");
  const birgit = persons.find((p) => p.id === "birgit");
  const heidi = persons.find((p) => p.id === "heidi");

  // Rule 6 — a target profile that isn't even loaded is unclear data, full stop.
  if (!levi || !birgit || !heidi) return null;

  // Rule 1/2 — Birgit's concrete, dated work status always takes priority
  // over the Levi/Heidi time logic, at any hour.
  if (worksToday(birgit, viennaNow)) return "birgit";

  const leviHasSchool = hasSchoolToday(levi, viennaNow);
  const heidiWorks = worksToday(heidi, viennaNow);

  // Rule 5 — both relevant at once (Levi has school AND Heidi works) → no auto-pick.
  if (leviHasSchool && heidiWorks) return null;

  // Rule 3 — Levi has school, Heidi isn't working → Levi from 07:00.
  if (leviHasSchool) {
    return minutes >= LEVI_AUTO_FROM_MINUTES ? "levi" : null;
  }

  // Rule 4 — Levi has no school today (weekend / schulfrei) → Heidi from 07:30.
  return minutes >= HEIDI_AUTO_FROM_MINUTES ? "heidi" : null;
}
