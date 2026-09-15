import { describe, expect, it } from "vitest";
import { resolveWorkBusGlance } from "@/lib/morning/work-bus-glance";

describe("resolveWorkBusGlance", () => {
  it("hides when not working", () => {
    const g = resolveWorkBusGlance({
      isWorking: false,
      plan: {
        mode: "bus",
        status: "on-time",
        busDeparture: "05:48",
        leaveHome: "05:36",
      },
    });
    expect(g.visible).toBe(false);
  });

  it("hides walking plans", () => {
    const g = resolveWorkBusGlance({
      isWorking: true,
      plan: { mode: "walking", status: "on-time", leaveHome: "07:35" },
    });
    expect(g.visible).toBe(false);
  });

  it("normal commute — no warning", () => {
    const g = resolveWorkBusGlance({
      isWorking: true,
      plan: {
        mode: "bus",
        status: "on-time",
        busDeparture: "05:48",
        leaveHome: "05:36",
        arrivalAtWork: "06:20",
        connections: [
          {
            departure: "05:48",
            arrival: "06:12",
            leaveHome: "05:36",
            durationMinutes: 36,
            realtime: true,
            cancelled: false,
            transfers: 0,
            isDirect: true,
            legs: [
              {
                type: "TRANSIT",
                departure: "05:48",
                arrival: "06:12",
                from: "Europaplatz",
                to: "Altersheimgasse",
                line: "1",
                direction: "Bruck",
                delayMinutes: 0,
                cancelled: false,
              },
            ],
            lineSummary: "Linie 1",
            direction: "Bruck",
            delayMinutes: 0,
            walkToStopMinutes: 12,
            walkTimeConfigured: true,
          },
        ],
      },
    });
    expect(g.visible).toBe(true);
    expect(g.kind).toBe("none");
    expect(g.alertTitle).toBeNull();
    expect(g.time).toBe("05:48");
    expect(g.lineTarget).toMatch(/Linie 1/);
    expect(g.arrival).toBe("06:12");
  });

  it("delay only when delayMinutes in data", () => {
    const g = resolveWorkBusGlance({
      isWorking: true,
      plan: {
        mode: "bus",
        status: "on-time",
        busDeparture: "05:56",
        bus: { departure: "05:56", delayMinutes: 8, line: "1", destination: "Bruck" },
      },
    });
    expect(g.kind).toBe("delay");
    expect(g.alertDetail).toBe("+8 Min. Verspätung");
    expect(g.alertTitle).toBeNull();
  });

  it("cancelled + next connection from alternative", () => {
    const g = resolveWorkBusGlance({
      isWorking: true,
      plan: {
        mode: "bus",
        status: "cancelled",
        bus: { cancelled: true, departure: "05:48" },
        alternativeConnection: {
          departure: "06:12",
          arrival: "06:40",
          leaveHome: "06:00",
          durationMinutes: 40,
          realtime: true,
          cancelled: false,
          transfers: 0,
          isDirect: true,
          legs: [
            {
              type: "TRANSIT",
              departure: "06:12",
              arrival: "06:40",
              from: "A",
              to: "B",
              line: "1",
              direction: "Bruck",
            },
          ],
          lineSummary: "Linie 1",
          direction: "Bruck",
          delayMinutes: null,
          walkToStopMinutes: 12,
          walkTimeConfigured: true,
        },
      },
    });
    expect(g.kind).toBe("cancelled");
    expect(g.alertTitle).toMatch(/fällt aus/);
    expect(g.nextTime).toBe("06:12");
    expect(g.nextLineTarget).toMatch(/Linie 1/);
  });

  it("deviation only when scheduled ≠ live", () => {
    const g = resolveWorkBusGlance({
      isWorking: true,
      plan: {
        mode: "bus",
        status: "on-time",
        busDeparture: "06:02",
        bus: {
          line: "1",
          destination: "Bruck",
          departure: "06:02",
          scheduledDeparture: "05:48",
          realtimeDeparture: "06:02",
          delayMinutes: 0,
        },
      },
    });
    expect(g.kind).toBe("deviation");
    expect(g.alertTitle).toMatch(/Achtung/);
    expect(g.alertDetail).toMatch(/anders/);
    expect(g.alertDetail).toMatch(/Geplant 05:48/);
  });

  it("never invents delay when absent", () => {
    const g = resolveWorkBusGlance({
      isWorking: true,
      plan: {
        mode: "bus",
        status: "on-time",
        busDeparture: "05:48",
        bus: { departure: "05:48", line: "1", destination: "Bruck" },
      },
    });
    expect(g.kind).toBe("none");
    expect(g.delayMinutes).toBeNull();
  });

  it("respects hideTodayBus (night)", () => {
    const g = resolveWorkBusGlance({
      isWorking: true,
      hideTodayBus: true,
      plan: {
        mode: "bus",
        status: "on-time",
        busDeparture: "05:48",
      },
    });
    expect(g.visible).toBe(false);
  });

  it("surfaces cancelled primary with next usable connection", () => {
    const g = resolveWorkBusGlance({
      isWorking: true,
      plan: {
        mode: "bus",
        status: "cancelled",
        isTestData: false,
        connections: [
          {
            departure: "05:48",
            arrival: "06:12",
            leaveHome: "05:36",
            durationMinutes: 36,
            realtime: true,
            cancelled: true,
            transfers: 0,
            isDirect: true,
            legs: [
              {
                type: "TRANSIT",
                departure: "05:48",
                arrival: "06:12",
                from: "Europaplatz",
                to: "Altersheimgasse",
                line: "1",
                direction: "Bruck",
                delayMinutes: null,
                cancelled: true,
              },
            ],
            lineSummary: "Linie 1",
            direction: "Bruck",
            delayMinutes: null,
            walkToStopMinutes: 12,
            walkTimeConfigured: true,
          },
        ],
        alternativeConnection: {
          departure: "06:10",
          arrival: "06:34",
          leaveHome: "05:58",
          durationMinutes: 36,
          realtime: true,
          cancelled: false,
          transfers: 0,
          isDirect: true,
          legs: [
            {
              type: "TRANSIT",
              departure: "06:10",
              arrival: "06:34",
              from: "Europaplatz",
              to: "Altersheimgasse",
              line: "1",
              direction: "Bruck",
              delayMinutes: 0,
              cancelled: false,
            },
          ],
          lineSummary: "Linie 1",
          direction: "Bruck",
          delayMinutes: 0,
          walkToStopMinutes: 12,
          walkTimeConfigured: true,
        },
      },
    });
    expect(g.visible).toBe(true);
    expect(g.kind).toBe("cancelled");
    expect(g.alertTitle).toMatch(/fällt aus/);
    expect(g.nextTime).toBe("06:10");
    expect(g.nextLineTarget).toMatch(/Linie 1/);
  });

  it("flags Testdaten when plan.isTestData", () => {
    const g = resolveWorkBusGlance({
      isWorking: true,
      plan: {
        mode: "bus",
        status: "on-time",
        isTestData: true,
        busDeparture: "05:48",
        bus: { departure: "05:48", line: "1", destination: "Bruck", isTestData: true },
      },
    });
    expect(g.visible).toBe(true);
    expect(g.isTestData).toBe(true);
  });
});
