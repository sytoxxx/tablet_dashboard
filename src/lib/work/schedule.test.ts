import { describe, expect, it } from "vitest";
import {
  buildWorkWeekGlance,
  getWorkShiftForDate,
  isFreeWorkDay,
} from "@/lib/work/schedule";
import type { PersonProfile, WorkShiftDay } from "@/lib/types";

const mon = new Date("2026-09-14T09:00:00.000Z"); // Monday

function person(week: Partial<Record<string, WorkShiftDay>>): PersonProfile {
  return {
    id: "birgit",
    name: "Birgit",
    avatar: "B",
    hint: "Arbeit",
    greeting: "",
    accent: "#000",
    schedule: { type: "work", week: week as never },
    appointments: [],
    busStop: null,
    tasks: [],
    defaultBringItems: [],
    weather: {
      summary: "",
      temperatureC: 10,
      clothingTip: "",
    } as never,
    personalSettings: {},
    displayPrefs: {} as never,
  };
}

describe("buildWorkWeekGlance status handling", () => {
  it("shows Arbeit/Frei/Urlaub/Krankenstand distinctly, absent day as Keine Daten", () => {
    const week = {
      mon: { label: "Frühschicht", start: "08:00", end: "16:00", location: "X", status: "work" },
      tue: { label: "Frei", start: "", end: "", location: "", status: "free" },
      wed: { label: "Urlaub", start: "", end: "", location: "", status: "vacation" },
      thu: { label: "Krankenstand", start: "", end: "", location: "", status: "sick" },
      // fri absent entirely
    } satisfies Partial<Record<string, WorkShiftDay>>;

    const glance = buildWorkWeekGlance({ type: "work", week: week as never }, mon);
    const byDay = Object.fromEntries(glance.map((g) => [g.day, g]));

    expect(byDay.mon).toMatchObject({ status: "work", statusLabel: "Arbeit", hours: "08:00–16:00" });
    expect(byDay.tue).toMatchObject({ status: "free", statusLabel: "Frei", hours: null });
    expect(byDay.wed).toMatchObject({ status: "vacation", statusLabel: "Urlaub", hours: null });
    expect(byDay.thu).toMatchObject({ status: "sick", statusLabel: "Krankenstand", hours: null });
    expect(byDay.fri).toMatchObject({ status: "unknown", statusLabel: "Keine Daten", hours: null });
  });

  it("still recognizes a legacy 'Frei...' label with no status field", () => {
    const week = {
      tue: { label: "Frei ab 12", start: "", end: "", location: "" },
    } satisfies Partial<Record<string, WorkShiftDay>>;
    const glance = buildWorkWeekGlance({ type: "work", week: week as never }, mon);
    const tue = glance.find((g) => g.day === "tue")!;
    expect(tue.status).toBe("free");
    expect(tue.statusLabel).toBe("Frei");
  });
});

describe("getWorkShiftForDate / isFreeWorkDay respect status", () => {
  it("returns null / true for an explicit non-work day, even though the day is present", () => {
    const p = person({
      mon: { label: "Urlaub", start: "", end: "", location: "", status: "vacation" },
    });
    expect(getWorkShiftForDate(p, mon)).toBeNull();
    expect(isFreeWorkDay(p, mon)).toBe(true);
  });

  it("returns the shift / false for a real work day", () => {
    const p = person({
      mon: { label: "Frühschicht", start: "08:00", end: "16:00", location: "X", status: "work" },
    });
    expect(getWorkShiftForDate(p, mon)).toMatchObject({ start: "08:00", end: "16:00" });
    expect(isFreeWorkDay(p, mon)).toBe(false);
  });

  it("returns null / true for a day with no entry at all", () => {
    const p = person({});
    expect(getWorkShiftForDate(p, mon)).toBeNull();
    expect(isFreeWorkDay(p, mon)).toBe(true);
  });
});
