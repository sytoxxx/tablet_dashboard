import { describe, expect, it } from "vitest";
import { resolveWorkBusGlance, selectUpcomingBusRows } from "@/lib/morning/work-bus-glance";

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
    expect(g.alertDetail).toMatch(/Heute fährt der Bus anders/);
    expect(g.alertDetail).toMatch(/Geplant 05:48/);
  });

  it("deviation uses Morgen wording when focusTomorrow", () => {
    const g = resolveWorkBusGlance({
      isWorking: true,
      focusTomorrow: true,
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
    expect(g.alertDetail).toMatch(/Morgen fährt der Bus anders/);
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

describe("resolveWorkBusGlance — confirmed vs typical basis", () => {
  const plan = {
    mode: "bus",
    status: "on-time" as const,
    busDeparture: "05:48",
    leaveHome: "05:36",
    bus: { departure: "05:48", line: "1", destination: "Bruck" },
  };

  it("labels a confirmed shift 'Für deinen Dienst' with no hint", () => {
    const g = resolveWorkBusGlance({ isWorking: true, plan, basis: "confirmed" });
    expect(g.title).toBe("Für deinen Dienst");
    expect(g.hint).toBeNull();
  });

  it("defaults to 'Für deinen Dienst' when basis is omitted (backward compatible)", () => {
    const g = resolveWorkBusGlance({ isWorking: true, plan });
    expect(g.title).toBe("Für deinen Dienst");
  });

  it("labels a typical-time plan 'Nach üblicher Arbeitszeit' with an honest hint", () => {
    const g = resolveWorkBusGlance({ isWorking: true, plan, basis: "typical" });
    expect(g.title).toBe("Nach üblicher Arbeitszeit");
    expect(g.hint).toBe("Monatsplan noch nicht verfügbar");
  });

  it("still shows the typical hint even in the quiet no-connection state", () => {
    const g = resolveWorkBusGlance({
      isWorking: true,
      basis: "typical",
      plan: { mode: "bus", status: "no-connection" },
    });
    expect(g.visible).toBe(true);
    expect(g.hint).toBe("Monatsplan noch nicht verfügbar");
  });
});

describe("selectUpcomingBusRows", () => {
  const NOW = new Date("2026-09-21T05:00:00Z"); // 07:00 Vienna (CEST)

  it("returns the next 3 real departures, dropping anything already gone", () => {
    const rows = selectUpcomingBusRows(
      [
        { time: "06:50", line: "1", destination: "Bruck" }, // already departed
        { time: "07:00", line: "1", destination: "Bruck" }, // departing right now — still relevant
        { time: "07:20", line: "2", destination: "Bruck" },
        { time: "07:40", line: "1", destination: "Bruck" },
        { time: "08:00", line: "2", destination: "Bruck" },
      ],
      NOW,
    );
    expect(rows.map((r) => r.time)).toEqual(["07:00", "07:20", "07:40"]);
  });

  it("returns fewer than 3 rows when fewer real connections exist — never pads", () => {
    const rows = selectUpcomingBusRows(
      [{ time: "07:20", line: "2", destination: "Bruck" }],
      NOW,
    );
    expect(rows).toHaveLength(1);
  });

  it("returns an empty array when nothing is upcoming, never invents a row", () => {
    expect(selectUpcomingBusRows([{ time: "06:00", line: "1", destination: "Bruck" }], NOW)).toEqual(
      [],
    );
    expect(selectUpcomingBusRows([], NOW)).toEqual([]);
    expect(selectUpcomingBusRows(null, NOW)).toEqual([]);
    expect(selectUpcomingBusRows(undefined, NOW)).toEqual([]);
  });

  it("keeps a cancelled entry in its chronological slot — selection never hides it, only display marks it", () => {
    const rows = selectUpcomingBusRows(
      [
        { time: "07:10", line: "1", destination: "Bruck", cancelled: true, status: "CANCELLED" },
        { time: "07:20", line: "2", destination: "Bruck" },
      ],
      NOW,
    );
    expect(rows[0]).toMatchObject({ time: "07:10", cancelled: true });
  });

  it("respects a custom limit", () => {
    const rows = selectUpcomingBusRows(
      [
        { time: "07:10", line: "1", destination: "Bruck" },
        { time: "07:20", line: "2", destination: "Bruck" },
        { time: "07:30", line: "1", destination: "Bruck" },
      ],
      NOW,
      2,
    );
    expect(rows).toHaveLength(2);
  });
});
