import { describe, expect, it } from "vitest";
import {
  createLeaveReminderFiredStore,
  leaveReminderEventKey,
  resolveLeaveReminder,
  resolveLeaveReminderPrefs,
  clampLeaveReminderVolume,
} from "@/lib/morning/leave-reminder";
import { buildMorningTimeline, LEAVE_SOON_LEAD_MINUTES } from "@/lib/morning/timeline";
import { planTravel } from "@/lib/work/travel-planner";
import type { LiveDeparture } from "@/lib/bus/select";
import type { TravelPlan } from "@/lib/work/travel-planner";
import {
  playLeaveReminderTone,
  unlockLeaveReminderAudio,
} from "@/lib/morning/leave-reminder-audio";

function at(h: number, m: number): Date {
  return new Date(2026, 8, 14, h, m, 0, 0);
}

function leviWalkingPlan(now = at(6, 0)): TravelPlan {
  return planTravel({
    personId: "levi",
    mode: "walking",
    arrivalTarget: "07:45",
    arrivalTargetEnd: "07:50",
    destinationLabel: "HTL Kapfenberg",
    transitPrefs: {
      leadTimeMinutes: 10,
      walkToStopMinutes: 10,
      preparationMinutes: 5,
      safetyBufferMinutes: 0,
      travelMode: "walking",
    },
    now,
  });
}

const busDeps: LiveDeparture[] = [
  {
    line: "1",
    destination: "Arbeit [TEST]",
    time: "07:00",
    estimatedArrivalHHmm: "07:30",
  },
  {
    line: "1",
    destination: "Arbeit [TEST]",
    time: "07:15",
    estimatedArrivalHHmm: "07:45",
  },
];

function birgitBusPlan(now = at(6, 0)): TravelPlan {
  return planTravel({
    personId: "birgit",
    mode: "bus",
    arrivalTarget: "08:00",
    transitPrefs: {
      leadTimeMinutes: 30,
      walkToStopMinutes: 12,
      preparationMinutes: 15,
      safetyBufferMinutes: 0,
      travelMode: "bus",
    },
    departures: busDeps,
    now,
    stopName: "Start",
  });
}

function heidiBusPlan(now = at(6, 0)): TravelPlan {
  return planTravel({
    personId: "heidi",
    mode: "bus",
    arrivalTarget: "09:00",
    transitPrefs: {
      leadTimeMinutes: 25,
      walkToStopMinutes: 8,
      stopToWorkMinutes: 5,
      preparationMinutes: 20,
      safetyBufferMinutes: 5,
      travelMode: "bus",
    },
    departures: [
      ...busDeps,
      {
        line: "2",
        destination: "Arbeit [TEST]",
        time: "08:20",
        estimatedArrivalHHmm: "08:50",
      },
    ],
    now,
    stopName: "Start",
  });
}

describe("leave reminder prefs", () => {
  it("defaults enabled and very quiet", () => {
    const prefs = resolveLeaveReminderPrefs();
    expect(prefs.enabled).toBe(true);
    expect(prefs.volume).toBe(0.08);
  });

  it("clamps volume to safe soft range", () => {
    expect(clampLeaveReminderVolume(1)).toBe(0.25);
    expect(clampLeaveReminderVolume(0)).toBe(0.02);
    expect(clampLeaveReminderVolume(0.1)).toBe(0.1);
  });
});

describe("leave reminder 3-minute rule", () => {
  it("sounds only ~3 minutes before leaveHome", () => {
    const travel = leviWalkingPlan();
    expect(travel.leaveHome).toBe("07:35");
    expect(LEAVE_SOON_LEAD_MINUTES).toBe(3);

    const soft = resolveLeaveReminder({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 30),
      travel,
      timelineState: "prepare_soft",
    });
    expect(soft.inCueWindow).toBe(false);
    expect(soft.soundDue).toBe(false);

    const cue = resolveLeaveReminder({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 32),
      travel,
      timelineState: "leave_soon",
    });
    expect(cue.inCueWindow).toBe(true);
    expect(cue.soundDue).toBe(true);
    expect(cue.minutesUntilLeave).toBe(3);
    expect(cue.label).toMatch(/3 Minuten/);

    const leaveNow = resolveLeaveReminder({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 35),
      travel,
      timelineState: "leave_now",
    });
    expect(leaveNow.inCueWindow).toBe(false);
    expect(leaveNow.soundDue).toBe(false);
  });

  it("no reminder during prepare_soft or leave_now", () => {
    const travel = leviWalkingPlan();
    expect(
      resolveLeaveReminder({
        personId: "levi",
        dateIso: "2026-09-14",
        now: at(7, 30),
        travel,
        timelineState: "prepare_soft",
      }).soundDue,
    ).toBe(false);
    expect(
      resolveLeaveReminder({
        personId: "levi",
        dateIso: "2026-09-14",
        now: at(7, 35),
        travel,
        timelineState: "leave_now",
      }).soundDue,
    ).toBe(false);
  });
});

describe("leave reminder duplicate protection", () => {
  it("fires at most once per leave event key", () => {
    const store = createLeaveReminderFiredStore();
    const travel = leviWalkingPlan();
    const key = leaveReminderEventKey("levi", "2026-09-14", travel.leaveHome!);

    const first = resolveLeaveReminder({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 32),
      travel,
      timelineState: "leave_soon",
    });
    expect(first.soundDue).toBe(true);
    expect(first.eventKey).toBe(key);

    store.mark(key);
    expect(store.has(key)).toBe(true);

    // Re-render / poll: same leaveHome → still soundDue, but store blocks replay
    const again = resolveLeaveReminder({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 33),
      travel,
      timelineState: "leave_soon",
    });
    expect(again.soundDue).toBe(true);
    expect(again.eventKey).toBe(key);
    expect(store.has(again.eventKey!)).toBe(true);
    expect(store.size()).toBe(1);
  });

  it("new leaveHome (bus delay) creates a new reminder key", () => {
    const store = createLeaveReminderFiredStore();
    const travelA = birgitBusPlan();
    expect(travelA.leaveHome).toBeTruthy();
    const keyA = leaveReminderEventKey("birgit", "2026-09-14", travelA.leaveHome!);
    store.mark(keyA);

    const delayed: TravelPlan = {
      ...travelA,
      leaveHome: "07:10",
      busDeparture: "07:22",
    };
    const cue = resolveLeaveReminder({
      personId: "birgit",
      dateIso: "2026-09-14",
      now: at(7, 7),
      travel: delayed,
      timelineState: "leave_soon",
    });
    expect(cue.soundDue).toBe(true);
    expect(cue.eventKey).not.toBe(keyA);
    expect(store.has(cue.eventKey!)).toBe(false);
  });
});

describe("leave reminder per person via travel plan", () => {
  it("Levi walking: cue from leaveHome without bus", () => {
    const travel = leviWalkingPlan();
    expect(travel.mode).toBe("walking");
    expect(travel.busDeparture).toBeNull();
    const cue = resolveLeaveReminder({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 32),
      travel,
      timelineState: "leave_soon",
    });
    expect(cue.leaveHome).toBe("07:35");
    expect(cue.soundDue).toBe(true);

    const tl = buildMorningTimeline({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 32),
      travel,
    });
    expect(tl.state).toBe("leave_soon");
    expect(tl.timeline.some((i) => i.kind === "bus")).toBe(false);
  });

  it("Birgit work-travel: cue uses planned leaveHome", () => {
    const travel = birgitBusPlan();
    expect(travel.mode).toBe("bus");
    expect(travel.leaveHome).toBeTruthy();
    const leave = travel.leaveHome!;
    const [hh, mm] = leave.split(":").map(Number);
    const cueAt = at(hh, mm - 3);
    const cue = resolveLeaveReminder({
      personId: "birgit",
      dateIso: "2026-09-14",
      now: cueAt,
      travel,
      timelineState: "leave_soon",
    });
    expect(cue.soundDue).toBe(true);
    expect(cue.leaveHome).toBe(leave);
  });

  it("Heidi work-travel: own leave time, independent of Birgit", () => {
    const birgit = birgitBusPlan();
    const heidi = heidiBusPlan();
    expect(heidi.leaveHome).not.toBe(birgit.leaveHome);

    const leave = heidi.leaveHome!;
    const [hh, mm] = leave.split(":").map(Number);
    const cue = resolveLeaveReminder({
      personId: "heidi",
      dateIso: "2026-09-14",
      now: at(hh, mm - 3),
      travel: heidi,
      timelineState: "leave_soon",
    });
    expect(cue.soundDue).toBe(true);
    expect(cue.eventKey).toContain("heidi");
    expect(cue.eventKey).not.toContain("birgit");
  });
});

describe("leave reminder audio resilience", () => {
  it("playLeaveReminderTone does not throw when AudioContext missing", async () => {
    await expect(playLeaveReminderTone(0.08)).resolves.toBe(false);
    await expect(unlockLeaveReminderAudio()).resolves.toBe(false);
  });
});

describe("morning timeline unchanged for soft / leave_now copy", () => {
  it("prepare_soft and leave_now keep labels without implying a tone", () => {
    const travel = leviWalkingPlan();
    const soft = buildMorningTimeline({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 30),
      travel,
    });
    expect(soft.state).toBe("prepare_soft");
    expect(soft.stateLabel).toBe("Langsam fertig werden");

    const go = buildMorningTimeline({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 35),
      travel,
    });
    expect(go.state).toBe("leave_now");
    expect(go.stateLabel).toBe("Jetzt losgehen");
  });
});
