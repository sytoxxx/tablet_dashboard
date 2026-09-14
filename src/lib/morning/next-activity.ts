import type { CalendarEvent } from "@/lib/types";
import {
  formatMinutesUntil,
  getMinutesSinceMidnight,
  parseTimeToMinutes,
} from "@/lib/format";
import {
  resolveDayFlow,
  type DayFlowState,
  type ScheduleBlock,
} from "@/lib/day/schedule-flow";
import { DAY_CONFIG } from "@/lib/day/config";
import type { NextActivity } from "@/lib/morning/types";

function appointmentBlocks(events: CalendarEvent[]): ScheduleBlock[] {
  return events.map((e) => ({
    start: e.time,
    title: e.title,
    kind: "block" as const,
  }));
}

function fromFlow(
  flow: DayFlowState,
  kind: NextActivity["kind"],
): NextActivity {
  if (flow.status === "free" || !flow.block) {
    return {
      status: "empty",
      flowKind: "free",
      title: null,
      time: null,
      place: null,
      relativeLabel: "Heute nichts geplant",
      message: "Heute nichts geplant",
      kind: "none",
    };
  }

  if (flow.status === "done") {
    return {
      status: "done",
      flowKind: "done",
      title: flow.block.title,
      time: flow.block.start,
      place: flow.block.place ?? null,
      relativeLabel: "erledigt",
      message: "Tag erledigt",
      kind,
    };
  }

  if (flow.status === "current") {
    return {
      status: "current",
      flowKind: "current",
      title: flow.block.title,
      time: flow.block.start,
      place: flow.block.place ?? null,
      relativeLabel: "läuft gerade",
      message: "Jetzt",
      kind,
    };
  }

  const mins = flow.minutesUntilStart;
  let relativeLabel = flow.relativeLabel;
  // Prefer “um HH:MM” when more than ~90 minutes away (calmer morning glance).
  if (mins !== null && mins > 90 && flow.block.start) {
    relativeLabel = `um ${flow.block.start}`;
  } else if (mins !== null && mins > 0) {
    relativeLabel = formatMinutesUntil(mins);
  }

  return {
    status: "upcoming",
    flowKind: "next",
    title: flow.block.title,
    time: flow.block.start,
    place: flow.block.place ?? null,
    relativeLabel,
    message: "Als Nächstes",
    kind,
  };
}

function kindFromBlock(block: ScheduleBlock | null): NextActivity["kind"] {
  if (!block) return "none";
  if (block.kind === "lesson") return "lesson";
  if (block.kind === "shift") return "shift";
  return "block";
}

/**
 * Next relevant activity for the morning dashboard.
 *
 * Priority:
 * 1. Current / upcoming school or work / personal blocks
 * 2. Else current / upcoming appointments
 * 3. Else empty (“Heute nichts geplant”) or done
 */
export function resolveNextActivity(input: {
  scheduleBlocks: ScheduleBlock[];
  appointments: CalendarEvent[];
  now: Date;
  /** When focusing tomorrow evening, treat schedule as morning-of-focus. */
  flowNow?: Date;
}): NextActivity {
  const flowNow = input.flowNow ?? input.now;
  const scheduleFlow = resolveDayFlow(input.scheduleBlocks, flowNow);

  if (scheduleFlow.status === "current" || scheduleFlow.status === "next") {
    return fromFlow(scheduleFlow, kindFromBlock(scheduleFlow.block));
  }

  const apptFlow = resolveDayFlow(
    appointmentBlocks(input.appointments),
    flowNow,
  );

  if (apptFlow.status === "current" || apptFlow.status === "next") {
    return fromFlow(apptFlow, "appointment");
  }

  if (
    scheduleFlow.status === "done" ||
    (scheduleFlow.status === "free" && apptFlow.status === "done")
  ) {
    // Prefer “done” only when something existed today.
    if (input.scheduleBlocks.length > 0 || input.appointments.length > 0) {
      const base =
        scheduleFlow.status === "done" ? scheduleFlow : apptFlow;
      return fromFlow(
        base,
        kindFromBlock(base.block) === "none" ? "appointment" : kindFromBlock(base.block),
      );
    }
  }

  return {
    status: "empty",
    flowKind: "free",
    title: null,
    time: null,
    place: null,
    relativeLabel: "Heute nichts geplant",
    message: "Heute nichts geplant",
    kind: "none",
  };
}

/** Appointments still relevant for the focus day (hide past). */
export function filterRelevantAppointments(
  events: CalendarEvent[],
  now: Date,
  opts?: { focusIsTomorrow?: boolean; includeCurrentGraceMin?: number },
): CalendarEvent[] {
  if (opts?.focusIsTomorrow) return [...events];
  const grace = opts?.includeCurrentGraceMin ?? 0;
  const current = getMinutesSinceMidnight(now);
  return events.filter((e) => {
    const start = parseTimeToMinutes(e.time);
    return start + grace >= current;
  });
}

/** Target HH:MM for bus lead-time (school/work start or desired arrival). */
export function resolveActivityStartForBus(
  scheduleBlocks: ScheduleBlock[],
  now: Date,
  desiredArrivalHHmm?: string | null,
): string | null {
  if (desiredArrivalHHmm?.trim()) return desiredArrivalHHmm.trim();
  const flow = resolveDayFlow(scheduleBlocks, now);
  if (flow.block && (flow.status === "next" || flow.status === "current")) {
    return flow.block.start;
  }
  // First block of the day if morning glance before anything started
  if (scheduleBlocks.length > 0) {
    const sorted = [...scheduleBlocks].sort(
      (a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start),
    );
    const first = sorted[0];
    const current = getMinutesSinceMidnight(now);
    if (parseTimeToMinutes(first.start) > current) return first.start;
  }
  return null;
}

/** Build a DayFlowState from NextActivity + wall clock (for existing hero UI). */
export function dayFlowFromNextActivity(
  activity: NextActivity,
  now: Date,
): DayFlowState {
  if (activity.status === "empty") {
    return {
      status: "free",
      block: null,
      message: "Heute nichts geplant",
      relativeLabel: "Heute nichts geplant",
      minutesUntilStart: null,
    };
  }

  const block: ScheduleBlock | null = activity.title
    ? {
        start: activity.time ?? "00:00",
        end: undefined,
        title: activity.title,
        place: activity.place ?? undefined,
        kind:
          activity.kind === "lesson"
            ? "lesson"
            : activity.kind === "shift"
              ? "shift"
              : "block",
      }
    : null;

  if (activity.status === "done") {
    return {
      status: "done",
      block,
      message: "Tag erledigt",
      relativeLabel: "erledigt",
      minutesUntilStart: null,
    };
  }

  if (activity.status === "current") {
    return {
      status: "current",
      block,
      message: "Jetzt",
      relativeLabel: "läuft gerade",
      minutesUntilStart: 0,
    };
  }

  const current = getMinutesSinceMidnight(now);
  const start = activity.time ? parseTimeToMinutes(activity.time) : current;
  const mins = Math.max(0, start - current);

  return {
    status: "next",
    block,
    message: "Als Nächstes",
    relativeLabel:
      mins > 90 && activity.time
        ? `um ${activity.time}`
        : mins > 0
          ? formatMinutesUntil(mins)
          : "gleich",
    minutesUntilStart: mins,
  };
}

/** Default duration used only when mapping appointments without end. */
export const APPOINTMENT_DEFAULT_DURATION_MIN =
  DAY_CONFIG.defaultBlockDurationMin;
