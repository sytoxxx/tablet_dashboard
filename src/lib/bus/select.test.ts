import { describe, expect, it } from "vitest";
import {
  selectRelevantDeparture,
  type LiveDeparture,
} from "@/lib/bus/select";

function at(h: number, m: number): Date {
  return new Date(2026, 8, 14, h, m, 0, 0);
}

const departures: LiveDeparture[] = [
  { line: "1", destination: "Bruck/Mur Bahnhof [TEST]", time: "05:12" },
  { line: "1", destination: "Bruck/Mur Bahnhof [TEST]", time: "05:32" },
  { line: "1", destination: "Bruck/Mur Bahnhof [TEST]", time: "05:52" },
  { line: "2", destination: "Apfelmoar Einkaufszentrum [TEST]", time: "05:40" },
  { line: "1", destination: "Bruck/Mur Bahnhof [TEST]", time: "06:10" },
];

describe("selectRelevantDeparture", () => {
  it("picks the next matching departure without target time", () => {
    const next = selectRelevantDeparture(departures, at(5, 20), {
      stopName: "Start",
      destinationHint: "Bruck",
    });
    expect(next?.departure).toBe("05:32");
    expect(next?.matchedToWork).toBe(false);
    expect(next?.arrivesInTime).toBeNull();
  });

  it("respects lead time and desired arrival (Birgit 06:00, 15 min lead)", () => {
    // Must depart by 05:45 → latest suitable is 05:32
    const next = selectRelevantDeparture(departures, at(5, 0), {
      stopName: "Start",
      targetStartHHMM: "06:00",
      leadTimeMinutes: 15,
      destinationHint: "Bruck",
    });
    expect(next?.departure).toBe("05:32");
    expect(next?.matchedToWork).toBe(true);
    expect(next?.arrivesInTime).toBe(true);
  });

  it("uses desired arrival with 30 min lead → latest before 05:30", () => {
    const next = selectRelevantDeparture(departures, at(5, 0), {
      stopName: "Start",
      targetStartHHMM: "06:00",
      leadTimeMinutes: 30,
      destinationHint: "Bruck",
    });
    expect(next?.departure).toBe("05:12");
    expect(next?.matchedToWork).toBe(true);
  });

  it("marks late connection when all departures are after cutoff", () => {
    const next = selectRelevantDeparture(departures, at(5, 50), {
      stopName: "Start",
      targetStartHHMM: "06:00",
      leadTimeMinutes: 30,
      destinationHint: "Bruck",
    });
    // Only 05:52 and 06:10 remain; cutoff 05:30 → none suitable
    expect(next?.departure).toBe("05:52");
    expect(next?.matchedToWork).toBe(false);
    expect(next?.arrivesInTime).toBe(false);
  });

  it("returns null when no connection left", () => {
    const next = selectRelevantDeparture(departures, at(12, 0), {
      stopName: "Start",
      destinationHint: "Bruck",
    });
    expect(next).toBeNull();
  });

  it("prefers preferred line when set", () => {
    const next = selectRelevantDeparture(departures, at(5, 0), {
      stopName: "Start",
      preferredLines: ["2"],
      targetStartHHMM: "06:00",
      leadTimeMinutes: 15,
    });
    expect(next?.line).toBe("2");
    expect(next?.departure).toBe("05:40");
  });

  it("uses estimated arrival when API provides it — never invents otherwise", () => {
    const withArrival: LiveDeparture[] = [
      {
        line: "1",
        destination: "Bruck/Mur Bahnhof [TEST]",
        time: "05:20",
        estimatedArrivalHHmm: "05:55",
      },
      {
        line: "1",
        destination: "Bruck/Mur Bahnhof [TEST]",
        time: "05:40",
        estimatedArrivalHHmm: "06:10",
      },
    ];
    const next = selectRelevantDeparture(withArrival, at(5, 0), {
      stopName: "Start",
      targetStartHHMM: "06:00",
      leadTimeMinutes: 5,
    });
    expect(next?.departure).toBe("05:20");
    expect(next?.arrivesInTime).toBe(true);
  });

  it("strict preferred line yields null when none match", () => {
    const next = selectRelevantDeparture(departures, at(5, 0), {
      stopName: "Start",
      preferredLines: ["99"],
      strictPreferredLine: true,
    });
    expect(next).toBeNull();
  });

  it("prefers realtime departure over timetable", () => {
    const next = selectRelevantDeparture(
      [
        {
          line: "1",
          destination: "Bruck/Mur Bahnhof [TEST]",
          time: "05:32",
          scheduledTime: "05:32",
          realtimeTime: "05:41",
          delayMinutes: 9,
          isRealtime: true,
        },
      ],
      at(5, 20),
      { stopName: "Start", source: "live" },
    );
    expect(next?.departure).toBe("05:41");
    expect(next?.scheduledDeparture).toBe("05:32");
    expect(next?.realtimeDeparture).toBe("05:41");
    expect(next?.delayMinutes).toBe(9);
    expect(next?.isRealtime).toBe(true);
    expect(next?.isTestData).toBe(false);
  });

  it("skips cancelled departures; surfaces cancel when only cancelled remain", () => {
    const skipped = selectRelevantDeparture(
      [
        {
          line: "1",
          destination: "Bruck",
          time: "05:32",
          cancelled: true,
        },
        {
          line: "1",
          destination: "Bruck",
          time: "05:52",
        },
      ],
      at(5, 20),
      { stopName: "Start" },
    );
    expect(skipped?.departure).toBe("05:52");
    expect(skipped?.cancelled).toBe(false);

    const onlyCancelled = selectRelevantDeparture(
      [
        {
          line: "1",
          destination: "Bruck",
          time: "05:32",
          cancelled: true,
        },
      ],
      at(5, 20),
      { stopName: "Start", source: "live" },
    );
    expect(onlyCancelled?.cancelled).toBe(true);
  });
});