import {
  getMinutesSinceMidnight,
  parseTimeToMinutes,
} from "@/lib/format";
import { DAY_CONFIG } from "@/lib/day/config";

export type DayFlowKind = "free" | "current" | "next" | "done";

export type ScheduleBlock = {
  start: string;
  end?: string;
  title: string;
  place?: string;
  kind: "lesson" | "shift" | "block";
};

export type DayFlowState = {
  status: DayFlowKind;
  block: ScheduleBlock | null;
  /** German status copy for the hero “Als Nächstes” area. */
  message: string;
};

function blockEndMinutes(block: ScheduleBlock): number {
  if (block.end) return parseTimeToMinutes(block.end);
  return parseTimeToMinutes(block.start) + DAY_CONFIG.defaultBlockDurationMin;
}

/**
 * Reusable day-flow: free / current / next / done (all past).
 */
export function resolveDayFlow(
  blocks: ScheduleBlock[],
  now: Date = new Date(),
): DayFlowState {
  if (blocks.length === 0) {
    return {
      status: "free",
      block: null,
      message: "Heute frei — nichts Festes im Plan.",
    };
  }

  const currentMin = getMinutesSinceMidnight(now);
  const sorted = [...blocks].sort(
    (a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start),
  );

  for (const block of sorted) {
    const start = parseTimeToMinutes(block.start);
    const end = blockEndMinutes(block);
    if (currentMin >= start && currentMin < end) {
      return {
        status: "current",
        block,
        message: "Jetzt",
      };
    }
  }

  for (const block of sorted) {
    const start = parseTimeToMinutes(block.start);
    if (currentMin < start) {
      return {
        status: "next",
        block,
        message: "Als Nächstes",
      };
    }
  }

  return {
    status: "done",
    block: sorted[sorted.length - 1] ?? null,
    message: "Dein Tag ist für heute erledigt.",
  };
}

export function blocksFromTimetable(
  entries: { time: string; subject: string; room: string }[],
): ScheduleBlock[] {
  return entries.map((e) => ({
    start: e.time,
    title: e.subject,
    place: e.room,
    kind: "lesson" as const,
  }));
}

export function blocksFromWorkShift(
  shift: { label: string; start: string; end: string; location: string } | null,
): ScheduleBlock[] {
  if (!shift) return [];
  return [
    {
      start: shift.start,
      end: shift.end,
      title: shift.label,
      place: shift.location,
      kind: "shift",
    },
  ];
}
