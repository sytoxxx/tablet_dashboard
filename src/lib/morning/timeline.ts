/**
 * Personal dynamic morning timeline — derived from TravelPlan + wall clock.
 * No hard-coded person clocks; states come from leave / prep / arrival.
 */
import { getMinutesSinceMidnight, minutesToHHmm, parseTimeToMinutes } from "@/lib/format";
import type { PersonId } from "@/lib/types";
import type { TravelPlan } from "@/lib/work/travel-planner";
import { arrivalWindowCopy } from "@/lib/work/travel-planner";

export type MorningTimelineState =
  | "relaxed"
  | "prepare_soft"
  | "prepare_now"
  | "leave_now"
  | "en_route"
  | "late"
  | "arrived"
  | "idle";

export type MorningTimelineItemKind =
  | "prepare"
  | "bag"
  | "leave"
  | "bus"
  | "arrive"
  | "hint";

export type MorningTimelineItem = {
  id: string;
  kind: MorningTimelineItemKind;
  label: string;
  time: string | null;
  /** Highlight when this is the current next action. */
  active?: boolean;
  done?: boolean;
};

export type MorningTimeline = {
  personId: PersonId;
  date: string;
  state: MorningTimelineState;
  /** Short German status for the dashboard. */
  stateLabel: string;
  nextAction: {
    label: string;
    time: string | null;
  } | null;
  timeline: MorningTimelineItem[];
  /** Minutes until leave (negative if past). */
  minutesUntilLeave: number | null;
};

const STATE_LABELS: Record<MorningTimelineState, string> = {
  relaxed: "Noch entspannt",
  prepare_soft: "Langsam fertig werden",
  prepare_now: "Jetzt fertig machen",
  leave_now: "Jetzt losgehen",
  en_route: "Du solltest bereits unterwegs sein",
  late: "Zeitdruck — bitte beeilen",
  arrived: "Zielzeit erreicht",
  idle: "Kein Morgenplan",
};

export type BuildMorningTimelineInput = {
  personId: PersonId;
  dateIso: string;
  now: Date;
  travel: TravelPlan | null;
  /** Optional bag / bring reminder on the timeline. */
  bagItems?: string[];
  /** Optional soft hint (weather etc.) — not a timed step. */
  softHint?: string | null;
};

/**
 * Derive “jetzt fertig machen” as the midpoint between prep start and leave,
 * or 5 minutes before leave when prep equals leave / missing.
 */
export function resolveFinishHardMinutes(
  prepMinutes: number | null,
  leaveMinutes: number,
): number {
  if (prepMinutes == null || prepMinutes >= leaveMinutes) {
    return Math.max(0, leaveMinutes - 5);
  }
  const mid = Math.floor((prepMinutes + leaveMinutes) / 2);
  // Prefer a point strictly after soft prep and before leave.
  if (mid <= prepMinutes) return Math.min(leaveMinutes - 1, prepMinutes + 1);
  if (mid >= leaveMinutes) return leaveMinutes - 1;
  return mid;
}

export function resolveMorningTimelineState(input: {
  nowMinutes: number;
  prepMinutes: number | null;
  leaveMinutes: number | null;
  arrivalMinutes: number | null;
  arrivalEndMinutes: number | null;
}): MorningTimelineState {
  const { nowMinutes, prepMinutes, leaveMinutes, arrivalMinutes, arrivalEndMinutes } =
    input;

  if (leaveMinutes == null && arrivalMinutes == null) return "idle";

  const arriveBy = arrivalEndMinutes ?? arrivalMinutes;
  const leave = leaveMinutes;
  const prep = prepMinutes;

  if (arriveBy != null && nowMinutes >= arriveBy) return "arrived";

  if (leave == null) {
    if (arriveBy != null && nowMinutes >= arriveBy - 5) return "late";
    return "relaxed";
  }

  // Past leave → leave_now briefly, then en_route until arrival window, else late
  if (nowMinutes >= leave) {
    if (arriveBy != null && nowMinutes >= arriveBy) return "arrived";
    if (arrivalMinutes != null && nowMinutes >= arrivalMinutes) return "arrived";
    if (nowMinutes < leave + 2) return "leave_now";
    if (arrivalMinutes == null || nowMinutes < arrivalMinutes) return "en_route";
    return "late";
  }

  const finishHard = resolveFinishHardMinutes(prep, leave);

  if (nowMinutes >= finishHard) return "prepare_now";
  if (prep != null && nowMinutes >= prep) return "prepare_soft";
  return "relaxed";
}

function itemDone(
  itemTime: string | null,
  nowMinutes: number,
  state: MorningTimelineState,
): boolean {
  if (!itemTime) return false;
  if (state === "arrived") return true;
  return parseTimeToMinutes(itemTime) < nowMinutes && state !== "leave_now";
}

/**
 * Build a calm, personal morning timeline from the shared travel plan.
 */
export function buildMorningTimeline(
  input: BuildMorningTimelineInput,
): MorningTimeline {
  const travel = input.travel;
  const nowMinutes = getMinutesSinceMidnight(input.now);

  if (
    !travel ||
    !travel.applicable ||
    travel.status === "not-applicable" ||
    travel.status === "disabled" ||
    (!travel.leaveHome && !travel.arrivalTarget)
  ) {
    return {
      personId: input.personId,
      date: input.dateIso,
      state: "idle",
      stateLabel: STATE_LABELS.idle,
      nextAction: null,
      timeline: [],
      minutesUntilLeave: null,
    };
  }

  // No usable connection for bus mode — still surface a clear idle/pressure-free empty plan
  if (
    travel.mode === "bus" &&
    (travel.status === "no-connection" || travel.status === "cancelled")
  ) {
    return {
      personId: input.personId,
      date: input.dateIso,
      state: "idle",
      stateLabel: "Kein passender Bus",
      nextAction: {
        label: "Kein passender Bus",
        time: null,
      },
      timeline: [],
      minutesUntilLeave: null,
    };
  }

  const prepMinutes = travel.preparationStart
    ? parseTimeToMinutes(travel.preparationStart)
    : null;
  const leaveMinutes = travel.leaveHome
    ? parseTimeToMinutes(travel.leaveHome)
    : null;
  const arrivalMinutes = travel.arrivalTarget
    ? parseTimeToMinutes(travel.arrivalTarget)
    : null;
  const arrivalEndMinutes = travel.arrivalTargetEnd
    ? parseTimeToMinutes(travel.arrivalTargetEnd)
    : null;

  const state = resolveMorningTimelineState({
    nowMinutes,
    prepMinutes,
    leaveMinutes,
    arrivalMinutes,
    arrivalEndMinutes,
  });

  const items: MorningTimelineItem[] = [];

  if (travel.preparationStart) {
    items.push({
      id: "prepare",
      kind: "prepare",
      label:
        state === "prepare_now" ? "Jetzt fertig machen" : "Langsam fertig werden",
      time: travel.preparationStart,
    });
  }

  if (input.bagItems && input.bagItems.length > 0 && travel.leaveHome) {
    const bagAt = minutesToHHmm(
      Math.max(
        prepMinutes ?? parseTimeToMinutes(travel.leaveHome) - 5,
        parseTimeToMinutes(travel.leaveHome) - 3,
      ),
    );
    items.push({
      id: "bag",
      kind: "bag",
      label: "Tasche fertig",
      time: bagAt,
    });
  }

  if (travel.mode === "bus" && travel.busDeparture) {
    items.push({
      id: "bus",
      kind: "bus",
      label: "Dein Bus",
      time: travel.busDeparture,
    });
  }

  if (travel.leaveHome) {
    items.push({
      id: "leave",
      kind: "leave",
      label: "Losgehen",
      time: travel.leaveHome,
    });
  }

  const arrivalLabel = arrivalWindowCopy(
    travel.arrivalTarget,
    travel.arrivalTargetEnd,
  );
  if (arrivalLabel) {
    items.push({
      id: "arrive",
      kind: "arrive",
      label: travel.destinationLabel || (travel.mode === "walking" ? "Schule" : "Arbeit"),
      time: arrivalLabel,
    });
  }

  // Sort by start time (arrival windows sort by start HH:MM)
  items.sort((a, b) => {
    const am = a.time ? parseTimeToMinutes(a.time.slice(0, 5)) : 0;
    const bm = b.time ? parseTimeToMinutes(b.time.slice(0, 5)) : 0;
    return am - bm;
  });

  const annotated = items.map((item) => {
    const done = itemDone(
      item.time ? item.time.slice(0, 5) : null,
      nowMinutes,
      state,
    );
    return { ...item, done };
  });

  // Mark active next incomplete item matching state
  let activeId: string | null = null;
  if (state === "prepare_soft" || state === "prepare_now") activeId = "prepare";
  else if (state === "leave_now") activeId = "leave";
  else if (state === "en_route" || state === "late") {
    activeId = travel.mode === "bus" ? "bus" : "leave";
  } else if (state === "relaxed") {
    activeId = annotated.find((i) => !i.done)?.id ?? null;
  }

  const timeline = annotated.map((item) => ({
    ...item,
    active: item.id === activeId,
  }));

  const stateLabel = STATE_LABELS[state];
  const activeItem = timeline.find((i) => i.active) ?? null;

  return {
    personId: input.personId,
    date: input.dateIso,
    state,
    stateLabel,
    nextAction:
      state === "idle"
        ? null
        : {
            label: stateLabel,
            time: activeItem?.time ?? travel.leaveHome,
          },
    timeline,
    minutesUntilLeave:
      leaveMinutes == null ? null : leaveMinutes - nowMinutes,
  };
}
