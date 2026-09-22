/**
 * The single, shared answer to "what do we actually know about this
 * person's work time on this date" — used identically for Birgit and Heidi,
 * both for the dashboard headline and for bus planning. Never falls back to
 * the legacy recurring `week` pattern (that would silently present an old
 * assumption as a confirmed shift); only a dated, scanned roster entry counts
 * as confirmed. A separate, explicitly-configured "typical work time" may
 * supply bus-planning orientation when no confirmed entry exists for the
 * date — it is never presented as a confirmed shift.
 */
import type { PersonProfile, WorkDayStatus, WorkShift } from "@/lib/types";
import { toIsoDate } from "@/lib/day/tomorrow";

export type WorkTimeResolution =
  | {
      kind: "confirmed";
      status: WorkDayStatus;
      /** Real shift details — only present when status is "work". */
      shift: WorkShift | null;
    }
  | { kind: "typical"; start: string; end: string }
  | { kind: "unavailable" };

export function resolveWorkTimeForDate(
  person: PersonProfile,
  date: Date,
): WorkTimeResolution {
  if (person.schedule.type !== "work") return { kind: "unavailable" };

  const iso = toIsoDate(date);
  const dated = person.schedule.entries?.find((e) => e.date === iso);
  if (dated) {
    if (dated.status === "work") {
      return {
        kind: "confirmed",
        status: "work",
        shift: {
          label: dated.label,
          start: dated.start,
          end: dated.end,
          location: dated.location,
          notes: dated.notes,
        },
      };
    }
    return { kind: "confirmed", status: dated.status, shift: null };
  }

  const start = person.transitPrefs?.typicalWorkStartHHmm?.trim();
  const end = person.transitPrefs?.typicalWorkEndHHmm?.trim();
  if (start && end) {
    return { kind: "typical", start, end };
  }

  return { kind: "unavailable" };
}
