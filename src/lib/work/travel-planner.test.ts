import { describe, expect, it } from "vitest";
import type { LiveDeparture } from "@/lib/bus/select";
import {
  isWorkTravelPerson,
  planTravel,
  planWorkTravel,
  preparationCopy,
} from "@/lib/work/travel-planner";
import type { TransitPrefs } from "@/lib/types";

function at(h: number, m: number): Date {
  return new Date(2026, 8, 14, h, m, 0, 0);
}

const exampleConnections: LiveDeparture[] = [
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

const birgitPrefs: TransitPrefs = {
  leadTimeMinutes: 30,
  walkToStopMinutes: 12,
  stopToWorkMinutes: 0,
  preparationMinutes: 15,
  safetyBufferMinutes: 0,
};

const heidiPrefs: TransitPrefs = {
  leadTimeMinutes: 25,
  walkToStopMinutes: 8,
  stopToWorkMinutes: 5,
  preparationMinutes: 20,
  safetyBufferMinutes: 5,
};

describe("planWorkTravel", () => {
  it("1. Arbeitsbeginn 08:00 → wählt die späteste passende Verbindung (07:15)", () => {
    const plan = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      workEnd: "16:00",
      transitPrefs: birgitPrefs,
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
      source: "local",
    });
    expect(plan.busDeparture).toBe("07:15");
    expect(plan.arrivalAtWork).toBe("07:45");
    expect(plan.status).toBe("on-time");
    expect(plan.matched).toBe(true);
  });

  it("2. Spätere Verbindung (07:30→08:05) wird ausgeschlossen", () => {
    const plan = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: birgitPrefs,
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
    });
    expect(plan.busDeparture).not.toBe("07:30");
    expect(plan.busDeparture).toBe("07:15");
  });

  it("3. Fußweg zur Arbeit wird berücksichtigt", () => {
    const plan = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: {
        ...birgitPrefs,
        stopToWorkMinutes: 20,
        safetyBufferMinutes: 0,
      },
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
    });
    // 07:15 arrives 07:45 + 20 = 08:05 → too late; 07:00 → 07:30 + 20 = 07:50 ok
    expect(plan.busDeparture).toBe("07:00");
    expect(plan.arrivalAtWork).toBe("07:50");
  });

  it("4. Fußweg zur Bushaltestelle wird berücksichtigt (Losgehen)", () => {
    const plan = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: { ...birgitPrefs, walkToStopMinutes: 12 },
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
    });
    expect(plan.busDeparture).toBe("07:15");
    expect(plan.leaveHome).toBe("07:03");
  });

  it("5. Sicherheits-Puffer wird berücksichtigt", () => {
    const plan = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: {
        ...birgitPrefs,
        stopToWorkMinutes: 0,
        safetyBufferMinutes: 20,
      },
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
    });
    // Need arrival ≤ 07:40 → only 07:00 (07:30) fits; 07:15 (07:45) fails
    expect(plan.busDeparture).toBe("07:00");
  });

  it("6. Vorbereitungszeit wird korrekt berechnet", () => {
    const plan = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: {
        ...birgitPrefs,
        walkToStopMinutes: 12,
        preparationMinutes: 15,
      },
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
    });
    // Losgehen 07:03 − 15 = 06:48
    expect(plan.leaveHome).toBe("07:03");
    expect(plan.preparationStart).toBe("06:48");
    expect(preparationCopy(plan.preparationStart)).toBe(
      "Ab 06:48 langsam fertig werden",
    );
  });

  it("7. Keine passende Verbindung → no-connection ohne ungeeigneten Bus", () => {
    const lateOnly: LiveDeparture[] = [
      {
        line: "1",
        destination: "Arbeit [TEST]",
        time: "07:30",
        estimatedArrivalHHmm: "08:05",
      },
    ];
    const plan = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: birgitPrefs,
      departures: lateOnly,
      now: at(6, 0),
      stopName: "Start",
    });
    expect(plan.status).toBe("no-connection");
    expect(plan.bus).toBeNull();
    expect(plan.busDeparture).toBeNull();
    expect(plan.message).toBe("Kein passender Bus");
  });

  it("8. Verspäteter Bus wird neu bewertet", () => {
    const delayed: LiveDeparture[] = [
      {
        line: "1",
        destination: "Arbeit [TEST]",
        time: "07:15",
        scheduledTime: "07:15",
        realtimeTime: "07:35",
        estimatedArrivalHHmm: "08:10",
        delayMinutes: 20,
        isRealtime: true,
        status: "DELAYED",
      },
      {
        line: "1",
        destination: "Arbeit [TEST]",
        time: "07:00",
        estimatedArrivalHHmm: "07:30",
      },
    ];
    const plan = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: birgitPrefs,
      departures: delayed,
      now: at(6, 0),
      stopName: "Start",
      source: "live",
    });
    expect(plan.busDeparture).toBe("07:00");
    expect(plan.status).toBe("on-time");
  });

  it("9. Ausgefallener Bus wird ausgeschlossen", () => {
    const withCancel: LiveDeparture[] = [
      {
        line: "1",
        destination: "Arbeit [TEST]",
        time: "07:15",
        estimatedArrivalHHmm: "07:45",
        cancelled: true,
        status: "CANCELLED",
      },
      {
        line: "1",
        destination: "Arbeit [TEST]",
        time: "07:00",
        estimatedArrivalHHmm: "07:30",
      },
    ];
    const plan = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: birgitPrefs,
      departures: withCancel,
      now: at(6, 0),
      stopName: "Start",
    });
    expect(plan.busDeparture).toBe("07:00");
    expect(plan.bus?.cancelled).not.toBe(true);
  });

  it("10. Nächster passender Bus wird gefunden wenn Favorit ausfällt", () => {
    const withCancel: LiveDeparture[] = [
      {
        line: "1",
        destination: "Arbeit [TEST]",
        time: "07:15",
        estimatedArrivalHHmm: "07:45",
        cancelled: true,
      },
      {
        line: "1",
        destination: "Arbeit [TEST]",
        time: "07:00",
        estimatedArrivalHHmm: "07:30",
      },
    ];
    const plan = planWorkTravel({
      personId: "heidi",
      workStart: "08:00",
      transitPrefs: { ...heidiPrefs, stopToWorkMinutes: 0, safetyBufferMinutes: 0 },
      departures: withCancel,
      now: at(6, 0),
      stopName: "Start",
    });
    expect(plan.busDeparture).toBe("07:00");
    expect(plan.status).toBe("on-time");
  });

  it("11. Realtime wird gegenüber Fahrplan bevorzugt", () => {
    const plan = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: { ...birgitPrefs, walkToStopMinutes: 0 },
      departures: [
        {
          line: "1",
          destination: "Arbeit [TEST]",
          time: "07:15",
          scheduledTime: "07:15",
          realtimeTime: "07:18",
          estimatedArrivalHHmm: "07:48",
          isRealtime: true,
          status: "REALTIME",
        },
      ],
      now: at(6, 0),
      stopName: "Start",
      source: "live",
    });
    expect(plan.busDeparture).toBe("07:18");
    expect(plan.bus?.isRealtime).toBe(true);
    expect(plan.isTestData).toBe(false);
  });

  it("12. Stale Cache wird nicht als Live angezeigt", () => {
    const plan = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: birgitPrefs,
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
      source: "cache",
    });
    expect(plan.isTestData).toBe(true);
    expect(plan.bus?.isTestData).toBe(true);
    expect(plan.bus?.source).toBe("cache");
  });

  it("13. Levi Schulweg: walking, nie Bus — Losgehen aus Ziel + Gehzeit", () => {
    expect(isWorkTravelPerson("levi")).toBe(false);
    const plan = planWorkTravel({
      personId: "levi",
      workStart: "07:45",
      transitPrefs: {
        travelMode: "walking",
        leadTimeMinutes: 10,
        walkToStopMinutes: 10,
        preparationMinutes: 5,
        safetyBufferMinutes: 0,
        desiredArrivalEndHHmm: "07:50",
        destinationLabel: "HTL Kapfenberg",
      },
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
    });
    expect(plan.mode).toBe("walking");
    expect(plan.applicable).toBe(true);
    expect(plan.bus).toBeNull();
    expect(plan.busDeparture).toBeNull();
    expect(plan.leaveHome).toBe("07:35");
    expect(plan.preparationStart).toBe("07:30");
    expect(plan.arrivalTarget).toBe("07:45");
    expect(plan.travelMinutes).toBe(10);
  });

  it("13b. Levi walking ignores bus departures entirely", () => {
    const plan = planTravel({
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
      },
      departures: exampleConnections,
      now: at(6, 0),
    });
    expect(plan.busDeparture).toBeNull();
    expect(plan.matched).toBe(true);
    expect(preparationCopy(plan.preparationStart)).toBe(
      "Ab 07:30 langsam fertig werden",
    );
  });

  it("13c. Levi safety buffer shifts leave-home earlier", () => {
    const plan = planTravel({
      personId: "levi",
      mode: "walking",
      arrivalTarget: "07:45",
      transitPrefs: {
        leadTimeMinutes: 10,
        walkToStopMinutes: 10,
        preparationMinutes: 5,
        safetyBufferMinutes: 5,
      },
      now: at(6, 0),
    });
    expect(plan.leaveHome).toBe("07:30");
    expect(plan.preparationStart).toBe("07:25");
  });

  it("14. Birgit und Heidi können unterschiedliche Einstellungen haben", () => {
    const birgit = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: birgitPrefs,
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
    });
    const heidi = planWorkTravel({
      personId: "heidi",
      workStart: "08:00",
      transitPrefs: heidiPrefs,
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
    });
    expect(birgit.walkToStopMinutes).toBe(12);
    expect(heidi.walkToStopMinutes).toBe(8);
    expect(birgit.preparationMinutes).toBe(15);
    expect(heidi.preparationMinutes).toBe(20);
    // Heidi: 07:15 → 07:45 + 5 Fuß + 5 Puffer = 07:55 ≤ 08:00 → still 07:15
    expect(heidi.busDeparture).toBe("07:15");
    expect(heidi.leaveHome).toBe("07:07");
    expect(heidi.arrivalAtWork).toBe("07:50");
  });

  it("15. Mehrere Arbeitstage mit unterschiedlichen Arbeitszeiten", () => {
    const monday = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      workEnd: "16:00",
      transitPrefs: birgitPrefs,
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
    });
    const tuesday = planWorkTravel({
      personId: "birgit",
      workStart: "09:00",
      workEnd: "17:00",
      transitPrefs: birgitPrefs,
      departures: [
        ...exampleConnections,
        {
          line: "1",
          destination: "Arbeit [TEST]",
          time: "08:20",
          estimatedArrivalHHmm: "08:50",
        },
      ],
      now: at(6, 0),
      stopName: "Start",
    });
    expect(monday.busDeparture).toBe("07:15");
    expect(tuesday.busDeparture).toBe("08:20");
    expect(tuesday.workStart).toBe("09:00");
  });

  it("16. Keine Fake-Daten im Production-Flow (local/cache markiert)", () => {
    const local = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: birgitPrefs,
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
      source: "local",
    });
    const live = planWorkTravel({
      personId: "birgit",
      workStart: "08:00",
      transitPrefs: birgitPrefs,
      departures: exampleConnections,
      now: at(6, 0),
      stopName: "Start",
      source: "live",
    });
    expect(local.isTestData).toBe(true);
    expect(live.isTestData).toBe(false);
  });
});
