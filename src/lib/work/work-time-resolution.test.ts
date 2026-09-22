import { describe, expect, it } from "vitest";
import { resolveWorkTimeForDate } from "@/lib/work/work-time-resolution";
import type { PersonProfile } from "@/lib/types";

const TODAY = new Date(2026, 8, 22, 12, 0, 0); // 2026-09-22
const TODAY_ISO = "2026-09-22";

function person(overrides: Partial<PersonProfile> = {}): PersonProfile {
  return {
    id: "birgit",
    name: "Birgit",
    avatar: "B",
    hint: "",
    greeting: "",
    accent: "#000",
    schedule: { type: "work", week: {}, entries: [] },
    appointments: [],
    busStop: null,
    tasks: [],
    defaultBringItems: [],
    weather: { summary: "", temperatureC: 10, clothingTip: "" },
    personalSettings: {},
    displayPrefs: {} as never,
    ...overrides,
  };
}

describe("resolveWorkTimeForDate", () => {
  it("confirmed work: a dated entry for the exact date wins, with the real shift", () => {
    const p = person({
      schedule: {
        type: "work",
        week: {},
        entries: [
          { date: TODAY_ISO, label: "Frühschicht", start: "06:00", end: "14:00", location: "Bruck", status: "work" },
        ],
      },
    });
    const r = resolveWorkTimeForDate(p, TODAY);
    expect(r).toEqual({
      kind: "confirmed",
      status: "work",
      shift: { label: "Frühschicht", start: "06:00", end: "14:00", location: "Bruck", notes: undefined },
    });
  });

  it("confirmed free/vacation/sick: a dated day-off entry is confirmed, never 'unavailable'", () => {
    for (const status of ["free", "vacation", "sick", "other"] as const) {
      const p = person({
        schedule: {
          type: "work",
          week: {},
          entries: [{ date: TODAY_ISO, label: "x", start: "", end: "", location: "", status }],
        },
      });
      expect(resolveWorkTimeForDate(p, TODAY)).toEqual({ kind: "confirmed", status, shift: null });
    }
  });

  it("never falls back to the legacy recurring week pattern for the exact date", () => {
    const p = person({
      schedule: {
        type: "work",
        // A recurring Monday pattern exists — must NOT be treated as confirmed for 2026-09-22 (a Tuesday).
        week: { tue: { label: "Büro", start: "09:00", end: "17:00", location: "Apfelmoar" } },
        entries: [],
      },
    });
    expect(resolveWorkTimeForDate(p, TODAY)).toEqual({ kind: "unavailable" });
  });

  it("typical: no dated entry, but an explicitly configured typical work time exists", () => {
    const p = person({
      transitPrefs: { leadTimeMinutes: 30, typicalWorkStartHHmm: "06:00", typicalWorkEndHHmm: "12:00" },
    });
    expect(resolveWorkTimeForDate(p, TODAY)).toEqual({ kind: "typical", start: "06:00", end: "12:00" });
  });

  it("typical requires BOTH start and end explicitly configured — a half-set value is unavailable", () => {
    const p = person({
      transitPrefs: { leadTimeMinutes: 30, typicalWorkStartHHmm: "06:00" },
    });
    expect(resolveWorkTimeForDate(p, TODAY)).toEqual({ kind: "unavailable" });
  });

  it("unavailable: neither a dated entry nor a typical work time exists — never invents one", () => {
    const p = person();
    expect(resolveWorkTimeForDate(p, TODAY)).toEqual({ kind: "unavailable" });
  });

  it("a confirmed dated entry always wins over a configured typical time", () => {
    const p = person({
      schedule: {
        type: "work",
        week: {},
        entries: [
          { date: TODAY_ISO, label: "Vertretung", start: "08:00", end: "14:00", location: "X", status: "work" },
        ],
      },
      transitPrefs: { leadTimeMinutes: 30, typicalWorkStartHHmm: "06:00", typicalWorkEndHHmm: "12:00" },
    });
    const r = resolveWorkTimeForDate(p, TODAY);
    expect(r.kind).toBe("confirmed");
    if (r.kind !== "confirmed") return;
    expect(r.shift?.start).toBe("08:00");
    expect(r.shift?.end).toBe("14:00");
  });

  it("a confirmed 'Frei' day wins over a configured typical time — no bus, not even oriented", () => {
    const p = person({
      schedule: {
        type: "work",
        week: {},
        entries: [{ date: TODAY_ISO, label: "Frei", start: "", end: "", location: "", status: "free" }],
      },
      transitPrefs: { leadTimeMinutes: 30, typicalWorkStartHHmm: "06:00", typicalWorkEndHHmm: "12:00" },
    });
    expect(resolveWorkTimeForDate(p, TODAY)).toEqual({ kind: "confirmed", status: "free", shift: null });
  });

  it("is unavailable for non-work schedule types (e.g. Levi's school schedule is untouched)", () => {
    const p = person({ schedule: { type: "school", week: {} } });
    expect(resolveWorkTimeForDate(p, TODAY)).toEqual({ kind: "unavailable" });
  });

  it("a dated entry for a different date does not leak into today's resolution", () => {
    const p = person({
      schedule: {
        type: "work",
        week: {},
        entries: [
          { date: "2026-09-21", label: "Frühschicht", start: "06:00", end: "14:00", location: "X", status: "work" },
        ],
      },
    });
    expect(resolveWorkTimeForDate(p, TODAY)).toEqual({ kind: "unavailable" });
  });
});
