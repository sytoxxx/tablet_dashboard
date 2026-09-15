/**
 * Personal leave reminder — one quiet cue ~3 minutes before leaveHome.
 * Uses TravelPlan.leaveHome from the shared planner; no parallel time math.
 */
import type { PersonId } from "@/lib/types";
import type { TravelPlan } from "@/lib/work/travel-planner";
import {
  LEAVE_SOON_LEAD_MINUTES,
  leaveSoonLabel,
  type MorningTimelineState,
} from "@/lib/morning/timeline";
import { getMinutesSinceMidnight, parseTimeToMinutes } from "@/lib/format";

export type LeaveReminderPrefs = {
  /** Default true. */
  enabled: boolean;
  /** Soft gain 0.02–0.25 (never loud). Default ~0.08. */
  volume: number;
};

export const DEFAULT_LEAVE_REMINDER_PREFS: LeaveReminderPrefs = {
  enabled: true,
  volume: 0.08,
};

export type LeaveReminderCue = {
  /** True when wall clock is in [leave − 3min, leave). */
  inCueWindow: boolean;
  /** Whether a sound is due for this evaluation (caller must dedupe by eventKey). */
  soundDue: boolean;
  /** Stable key: person|date|leaveHome — changes when leave time changes. */
  eventKey: string | null;
  label: string | null;
  minutesUntilLeave: number | null;
  leaveHome: string | null;
  enabled: boolean;
};

export function clampLeaveReminderVolume(raw: unknown, fallback = 0.08): number {
  const n = typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
  return Math.min(0.25, Math.max(0.02, n));
}

export function resolveLeaveReminderPrefs(input?: {
  enabled?: boolean;
  volume?: number;
} | null): LeaveReminderPrefs {
  return {
    enabled: input?.enabled !== false,
    volume: clampLeaveReminderVolume(
      input?.volume,
      DEFAULT_LEAVE_REMINDER_PREFS.volume,
    ),
  };
}

/**
 * Build event key for one leave event. New leaveHome → new key → new cue allowed.
 */
export function leaveReminderEventKey(
  personId: PersonId,
  dateIso: string,
  leaveHome: string,
): string {
  return `${personId}|${dateIso}|${leaveHome}`;
}

function blocksSound(state: MorningTimelineState | null | undefined): boolean {
  if (!state) return false;
  return (
    state === "prepare_soft" ||
    state === "leave_now" ||
    state === "en_route" ||
    state === "late" ||
    state === "arrived" ||
    state === "idle" ||
    state === "relaxed"
  );
}

/**
 * Pure reminder resolution from travel leaveHome + now.
 * Sound only inside the leave-soon window — never at prepare_soft or leave_now.
 */
export function resolveLeaveReminder(input: {
  personId: PersonId;
  dateIso: string;
  now: Date;
  travel: TravelPlan | null;
  prefs?: LeaveReminderPrefs | null;
  /** Optional timeline state for extra safety. */
  timelineState?: MorningTimelineState | null;
}): LeaveReminderCue {
  const prefs = resolveLeaveReminderPrefs(input.prefs);
  const empty: LeaveReminderCue = {
    inCueWindow: false,
    soundDue: false,
    eventKey: null,
    label: null,
    minutesUntilLeave: null,
    leaveHome: null,
    enabled: prefs.enabled,
  };

  if (!prefs.enabled) return empty;

  const travel = input.travel;
  if (
    !travel ||
    !travel.applicable ||
    !travel.leaveHome ||
    travel.status === "not-applicable" ||
    travel.status === "disabled" ||
    travel.status === "no-connection" ||
    travel.status === "cancelled"
  ) {
    return empty;
  }

  const leaveMinutes = parseTimeToMinutes(travel.leaveHome);
  const nowMinutes = getMinutesSinceMidnight(input.now);
  const minutesUntilLeave = leaveMinutes - nowMinutes;
  const eventKey = leaveReminderEventKey(
    input.personId,
    input.dateIso,
    travel.leaveHome,
  );

  const inCueWindow =
    minutesUntilLeave > 0 && minutesUntilLeave <= LEAVE_SOON_LEAD_MINUTES;

  const soundDue =
    inCueWindow && !blocksSound(input.timelineState);

  return {
    inCueWindow,
    soundDue,
    eventKey,
    label: inCueWindow ? leaveSoonLabel(minutesUntilLeave) : null,
    minutesUntilLeave,
    leaveHome: travel.leaveHome,
    enabled: true,
  };
}

/** In-memory fired set helper for tests / hook. */
export function createLeaveReminderFiredStore() {
  const fired = new Set<string>();
  return {
    has: (key: string) => fired.has(key),
    mark: (key: string) => {
      fired.add(key);
    },
    clear: () => fired.clear(),
    size: () => fired.size,
  };
}
