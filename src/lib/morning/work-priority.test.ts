import { describe, expect, it } from "vitest";
import {
  resolveNextUpGlance,
  resolveWorkMorningPriority,
} from "@/lib/morning/work-priority";

describe("resolveWorkMorningPriority", () => {
  it("working day when shift exists", () => {
    const p = resolveWorkMorningPriority({
      workShift: {
        label: "Früh",
        start: "06:00",
        end: "14:00",
        location: "Bruck",
      },
      appointments: [],
    });
    expect(p.isWorking).toBe(true);
    expect(p.isFree).toBe(false);
  });

  it("free day copy — never invents work", () => {
    const today = resolveWorkMorningPriority({
      workShift: null,
      appointments: [],
    });
    expect(today.isFree).toBe(true);
    expect(today.freeDayCopy).toBe("Du hast heute frei. 🌿");

    const tomorrow = resolveWorkMorningPriority({
      workShift: null,
      appointments: [],
      focusIsTomorrow: true,
    });
    expect(tomorrow.freeDayCopy).toBe("Du hast morgen frei. 🌿");
  });

  it("surfaces next appointment without inventing", () => {
    const p = resolveWorkMorningPriority({
      workShift: null,
      appointments: [{ time: "16:00", title: "Arzttermin" }],
    });
    expect(p.nextAppointment).toEqual({
      time: "16:00",
      title: "Arzttermin",
    });
  });

  it("defaults isUnavailable to false — existing callers are unaffected", () => {
    const working = resolveWorkMorningPriority({
      workShift: { label: "Früh", start: "06:00", end: "14:00", location: "Bruck" },
      appointments: [],
    });
    expect(working.isUnavailable).toBe(false);
    const free = resolveWorkMorningPriority({ workShift: null, appointments: [] });
    expect(free.isUnavailable).toBe(false);
    expect(free.isFree).toBe(true);
  });

  it("confirmation 'typical'/'unavailable' is never shown as working or free, even with a shift-shaped value present", () => {
    const typical = resolveWorkMorningPriority({
      workShift: { label: "x", start: "06:00", end: "12:00", location: "" },
      appointments: [],
      confirmation: "typical",
    });
    expect(typical.isWorking).toBe(false);
    expect(typical.isFree).toBe(false);
    expect(typical.isUnavailable).toBe(true);

    const unavailable = resolveWorkMorningPriority({
      workShift: null,
      appointments: [],
      confirmation: "unavailable",
    });
    expect(unavailable.isWorking).toBe(false);
    expect(unavailable.isFree).toBe(false);
    expect(unavailable.isUnavailable).toBe(true);
  });

  it("confirmation 'confirmed' (explicit) behaves exactly like the default", () => {
    const p = resolveWorkMorningPriority({
      workShift: { label: "Früh", start: "06:00", end: "14:00", location: "Bruck" },
      appointments: [],
      confirmation: "confirmed",
    });
    expect(p.isWorking).toBe(true);
    expect(p.isUnavailable).toBe(false);
  });
});

describe("resolveNextUpGlance", () => {
  it("prefers leave time when known", () => {
    expect(
      resolveNextUpGlance({
        isWorking: true,
        isFree: false,
        leaveHome: "05:48",
        workStart: "06:30",
      }),
    ).toEqual({ title: "Los um 05:48", detail: "Losfahren" });
  });

  it("falls back to work start", () => {
    expect(
      resolveNextUpGlance({
        isWorking: true,
        isFree: false,
        workStart: "06:30",
      }),
    ).toEqual({ title: "Arbeit ab 06:30", detail: "Heute" });
  });

  it("uses appointment when no leave/work", () => {
    expect(
      resolveNextUpGlance({
        isWorking: false,
        isFree: true,
        appointment: { time: "15:30", title: "Nachhilfe" },
      }),
    ).toEqual({ title: "Nachhilfe", detail: "um 15:30" });
  });

  it("coffee only when ready + message real", () => {
    expect(
      resolveNextUpGlance({
        isWorking: false,
        isFree: false,
        coffeeReady: true,
        coffeeMessage: "Kaffee ist bereit",
      }),
    ).toEqual({ title: "Kaffee ist bereit", detail: "Kaffee" });

    expect(
      resolveNextUpGlance({
        isWorking: false,
        isFree: false,
        coffeeReady: true,
        coffeeMessage: "   ",
      }).title,
    ).toBe("Heute ist nichts Dringendes.");
  });

  it("never invents actions on free day", () => {
    expect(
      resolveNextUpGlance({
        isWorking: false,
        isFree: true,
      }),
    ).toEqual({
      title: "Heute ist nichts Dringendes.",
      detail: null,
    });
  });
});
