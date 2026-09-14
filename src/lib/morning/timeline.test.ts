import { describe, expect, it } from "vitest";
import {
  buildMorningTimeline,
  resolveFinishHardMinutes,
  resolveMorningTimelineState,
} from "@/lib/morning/timeline";
import { planTravel } from "@/lib/work/travel-planner";
import { buildEveningPrep } from "@/lib/evening/prep";
import { seedPersons } from "@/data/seed";
import { getMorningOverview } from "@/lib/morning/overview";
import { seedAppData } from "@/data/seed";
import type { LiveDeparture } from "@/lib/bus/select";

function at(h: number, m: number): Date {
  return new Date(2026, 8, 14, h, m, 0, 0); // Monday
}

function leviTravel() {
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
    now: at(6, 0),
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
  {
    line: "1",
    destination: "Arbeit [TEST]",
    time: "07:30",
    estimatedArrivalHHmm: "08:05",
  },
];

describe("morning timeline states", () => {
  it("finish-hard sits between prep and leave", () => {
    expect(resolveFinishHardMinutes(7 * 60 + 30, 7 * 60 + 35)).toBe(
      7 * 60 + 32,
    );
  });

  it("Levi: relaxed → prepare_soft → leave_soon → leave_now → en_route", () => {
    const travel = leviTravel();
    expect(travel.leaveHome).toBe("07:35");
    expect(travel.preparationStart).toBe("07:30");
    expect(travel.busDeparture).toBeNull();

    expect(
      resolveMorningTimelineState({
        nowMinutes: 6 * 60 + 45,
        prepMinutes: 7 * 60 + 30,
        leaveMinutes: 7 * 60 + 35,
        arrivalMinutes: 7 * 60 + 45,
        arrivalEndMinutes: 7 * 60 + 50,
      }),
    ).toBe("relaxed");

    expect(
      resolveMorningTimelineState({
        nowMinutes: 7 * 60 + 30,
        prepMinutes: 7 * 60 + 30,
        leaveMinutes: 7 * 60 + 35,
        arrivalMinutes: 7 * 60 + 45,
        arrivalEndMinutes: 7 * 60 + 50,
      }),
    ).toBe("prepare_soft");

    // 3 minutes before leave → leave_soon (takes priority over prepare_now)
    expect(
      resolveMorningTimelineState({
        nowMinutes: 7 * 60 + 32,
        prepMinutes: 7 * 60 + 30,
        leaveMinutes: 7 * 60 + 35,
        arrivalMinutes: 7 * 60 + 45,
        arrivalEndMinutes: 7 * 60 + 50,
      }),
    ).toBe("leave_soon");

    expect(
      resolveMorningTimelineState({
        nowMinutes: 7 * 60 + 35,
        prepMinutes: 7 * 60 + 30,
        leaveMinutes: 7 * 60 + 35,
        arrivalMinutes: 7 * 60 + 45,
        arrivalEndMinutes: 7 * 60 + 50,
      }),
    ).toBe("leave_now");

    expect(
      resolveMorningTimelineState({
        nowMinutes: 7 * 60 + 40,
        prepMinutes: 7 * 60 + 30,
        leaveMinutes: 7 * 60 + 35,
        arrivalMinutes: 7 * 60 + 45,
        arrivalEndMinutes: 7 * 60 + 50,
      }),
    ).toBe("en_route");
  });

  it("prepare_now appears when leave-soon window has not started", () => {
    expect(
      resolveMorningTimelineState({
        nowMinutes: 7 * 60 + 20,
        prepMinutes: 7 * 60 + 0,
        leaveMinutes: 7 * 60 + 35,
        arrivalMinutes: 7 * 60 + 45,
        arrivalEndMinutes: 7 * 60 + 50,
      }),
    ).toBe("prepare_now");
  });

  it("Levi timeline has no bus step", () => {
    const tl = buildMorningTimeline({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 22),
      travel: leviTravel(),
      bagItems: ["Laptop"],
    });
    expect(tl.state).toBe("relaxed");
    expect(tl.timeline.some((i) => i.kind === "bus")).toBe(false);
    expect(tl.timeline.some((i) => i.kind === "leave")).toBe(true);
    expect(tl.timeline.find((i) => i.kind === "arrive")?.label).toMatch(/HTL/);
  });

  it("Zeitdruck / arrived from arrival window", () => {
    expect(
      resolveMorningTimelineState({
        nowMinutes: 7 * 60 + 50,
        prepMinutes: 7 * 60 + 30,
        leaveMinutes: 7 * 60 + 35,
        arrivalMinutes: 7 * 60 + 45,
        arrivalEndMinutes: 7 * 60 + 50,
      }),
    ).toBe("arrived");
  });
});

describe("personal timelines differ", () => {
  it("Birgit and Heidi get different leave times from own prefs + work start", () => {
    const birgit = planTravel({
      personId: "birgit",
      mode: "bus",
      arrivalTarget: "08:00",
      transitPrefs: {
        leadTimeMinutes: 30,
        walkToStopMinutes: 12,
        stopToWorkMinutes: 0,
        preparationMinutes: 15,
        safetyBufferMinutes: 0,
        travelMode: "bus",
      },
      departures: busDeps,
      now: at(6, 0),
      stopName: "Start",
    });
    const heidi = planTravel({
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
      now: at(6, 0),
      stopName: "Start",
    });
    expect(birgit.busDeparture).toBe("07:15");
    expect(heidi.busDeparture).toBe("08:20");
    expect(birgit.leaveHome).not.toBe(heidi.leaveHome);

    const bt = buildMorningTimeline({
      personId: "birgit",
      dateIso: "2026-09-14",
      now: at(6, 30),
      travel: birgit,
    });
    const ht = buildMorningTimeline({
      personId: "heidi",
      dateIso: "2026-09-14",
      now: at(6, 30),
      travel: heidi,
    });
    expect(bt.timeline.find((i) => i.kind === "bus")?.time).toBe("07:15");
    expect(ht.timeline.find((i) => i.kind === "bus")?.time).toBe("08:20");
  });

  it("different days → different Birgit targets change timeline leave", () => {
    const mon = planTravel({
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
      now: at(6, 0),
      stopName: "S",
    });
    const tue = planTravel({
      personId: "birgit",
      mode: "bus",
      arrivalTarget: "09:00",
      transitPrefs: {
        leadTimeMinutes: 30,
        walkToStopMinutes: 12,
        preparationMinutes: 15,
        safetyBufferMinutes: 0,
        travelMode: "bus",
      },
      departures: [
        ...busDeps,
        {
          line: "1",
          destination: "Arbeit [TEST]",
          time: "08:20",
          estimatedArrivalHHmm: "08:50",
        },
      ],
      now: at(6, 0),
      stopName: "S",
    });
    expect(mon.leaveHome).not.toBe(tue.leaveHome);
  });

  it("no connection → idle timeline with clear nextAction", () => {
    const plan = planTravel({
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
      departures: [
        {
          line: "1",
          destination: "Arbeit [TEST]",
          time: "07:30",
          estimatedArrivalHHmm: "08:05",
        },
      ],
      now: at(6, 0),
      stopName: "S",
    });
    expect(plan.status).toBe("no-connection");
    const tl = buildMorningTimeline({
      personId: "birgit",
      dateIso: "2026-09-14",
      now: at(6, 30),
      travel: plan,
    });
    expect(tl.state).toBe("idle");
    expect(tl.nextAction?.label).toMatch(/Kein passender Bus/);
  });

  it("delayed bus re-evaluates to earlier connection in travel plan", () => {
    const plan = planTravel({
      personId: "birgit",
      mode: "bus",
      arrivalTarget: "08:00",
      transitPrefs: {
        leadTimeMinutes: 30,
        walkToStopMinutes: 0,
        preparationMinutes: 10,
        safetyBufferMinutes: 0,
        travelMode: "bus",
      },
      departures: [
        {
          line: "1",
          destination: "Arbeit [TEST]",
          time: "07:15",
          scheduledTime: "07:15",
          realtimeTime: "07:35",
          estimatedArrivalHHmm: "08:10",
          delayMinutes: 20,
          isRealtime: true,
        },
        {
          line: "1",
          destination: "Arbeit [TEST]",
          time: "07:00",
          estimatedArrivalHHmm: "07:30",
        },
      ],
      now: at(6, 0),
      stopName: "S",
      source: "live",
    });
    expect(plan.busDeparture).toBe("07:00");
  });
});

describe("evening prep foundation", () => {
  it("builds tomorrow prep without inventing wardrobe", () => {
    const levi = seedPersons.find((p) => p.id === "levi")!;
    const prep = buildEveningPrep({
      person: levi,
      now: at(19, 0),
      weather: {
        summary: "Regen",
        temperatureC: 10,
        clothingTip: "Jacke mitnehmen",
      },
    });
    expect(prep.title).toMatch(/morgen/i);
    expect(prep.wardrobeReady).toBe(false);
    const outfit = prep.items.find((i) => i.kind === "outfit");
    expect(outfit?.status).toBe("unavailable");
    expect(outfit?.detail).toMatch(/Kleiderschrank/i);
    expect(prep.items.find((i) => i.kind === "shoes")?.detail).toMatch(
      /nicht verfügbar/i,
    );
    expect(prep.leaveHome).toBe("07:35");
    expect(prep.items.find((i) => i.kind === "weather")?.detail).toMatch(/Jacke/i);
  });

  it("overview evening context exposes eveningPrep visibility", () => {
    const o = getMorningOverview("levi", at(19, 30), {
      person: seedPersons.find((p) => p.id === "levi")!,
      data: seedAppData,
    });
    expect(o.focusIsTomorrow).toBe(true);
    expect(o.eveningPrep).not.toBeNull();
    expect(o.visibility.eveningPrep).toBe(true);
    expect(o.visibility.timeline).toBe(false);
  });

  it("Levi morning overview has walking timeline, no bus", () => {
    const o = getMorningOverview("levi", at(7, 20), {
      person: seedPersons.find((p) => p.id === "levi")!,
      data: seedAppData,
    });
    expect(o.travelPlan?.mode).toBe("walking");
    expect(o.travelPlan?.busDeparture).toBeNull();
    expect(o.bus.enabled).toBe(false);
    expect(o.timeline?.state).toBe("relaxed");
    expect(o.priorityOrder).toContain("timeline");
  });
});
