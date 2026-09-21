import { describe, expect, it } from "vitest";
import { resolveAutoProfile } from "@/lib/profile/auto-select";
import type { PersonProfile, WorkPlanEntry } from "@/lib/types";

// 2026-09-21 is a Monday (Vienna). All test times are given as Vienna wall-clock.
function viennaTime(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  // UTC+2 in September (CEST) — construct the UTC instant for that Vienna wall time.
  return new Date(Date.UTC(2026, 8, 21, h! - 2, m));
}

function workEntry(date: string, overrides: Partial<WorkPlanEntry> = {}): WorkPlanEntry {
  return { date, label: "Frühschicht", start: "06:00", end: "14:00", location: "X", status: "work", ...overrides };
}

function birgitWith(entries: WorkPlanEntry[]): PersonProfile {
  return {
    id: "birgit",
    name: "Birgit",
    avatar: "B",
    hint: "Arbeit",
    greeting: "",
    accent: "#000",
    schedule: { type: "work", week: {}, entries },
    appointments: [],
    busStop: null,
    tasks: [],
    defaultBringItems: [],
    weather: { summary: "", temperatureC: 10, clothingTip: "" } as never,
    personalSettings: {},
    displayPrefs: {} as never,
  };
}

function heidiWith(entries: WorkPlanEntry[]): PersonProfile {
  return { ...birgitWith(entries), id: "heidi", name: "Heidi" };
}

function leviWith(hasSchoolMonday: boolean): PersonProfile {
  return {
    id: "levi",
    name: "Levi",
    avatar: "L",
    hint: "Schule",
    greeting: "",
    accent: "#000",
    schedule: {
      type: "school",
      week: hasSchoolMonday
        ? { mon: { lessons: [{ id: "l1", time: "08:15", subject: "Deutsch", room: "A1" }] } }
        : {},
    },
    appointments: [],
    busStop: null,
    tasks: [],
    defaultBringItems: [],
    weather: { summary: "", temperatureC: 10, clothingTip: "" } as never,
    personalSettings: {},
    displayPrefs: {} as never,
  };
}

const TODAY = "2026-09-21";

describe("resolveAutoProfile", () => {
  it("Birgit Frühdienst — auto-selects Birgit regardless of the Levi/Heidi time gates", () => {
    const persons = [leviWith(true), birgitWith([workEntry(TODAY)]), heidiWith([])];
    expect(resolveAutoProfile(persons, viennaTime("06:00"))).toBe("birgit");
    expect(resolveAutoProfile(persons, viennaTime("08:00"))).toBe("birgit");
  });

  it("Birgit frei/Urlaub/Krankenstand — never auto-selects Birgit", () => {
    for (const status of ["free", "vacation", "sick", "other"] as const) {
      const persons = [
        leviWith(true),
        birgitWith([workEntry(TODAY, { status, label: status, start: "", end: "", location: "" })]),
        heidiWith([]),
      ];
      expect(resolveAutoProfile(persons, viennaTime("08:00"))).not.toBe("birgit");
    }
  });

  it("Levi Schule, Heidi frei — Levi from exactly 07:00, not before", () => {
    const persons = [leviWith(true), birgitWith([]), heidiWith([])];
    expect(resolveAutoProfile(persons, viennaTime("06:59"))).toBeNull();
    expect(resolveAutoProfile(persons, viennaTime("07:00"))).toBe("levi");
  });

  it("Levi schulfrei / Wochenende — Heidi from exactly 07:30, not before", () => {
    const persons = [leviWith(false), birgitWith([]), heidiWith([])];
    expect(resolveAutoProfile(persons, viennaTime("07:29"))).toBeNull();
    expect(resolveAutoProfile(persons, viennaTime("07:30"))).toBe("heidi");
  });

  it("Levi + Heidi both relevant at once — no auto-pick, even well past both thresholds", () => {
    const persons = [leviWith(true), birgitWith([]), heidiWith([workEntry(TODAY)])];
    expect(resolveAutoProfile(persons, viennaTime("09:00"))).toBeNull();
  });

  it("unclear data (nobody configured) — no auto-pick", () => {
    const persons = [leviWith(false), birgitWith([])]; // heidi missing entirely
    expect(resolveAutoProfile(persons, viennaTime("09:00"))).toBeNull();
  });

  it("Birgit not working, Levi no school, Heidi also not working — still defaults to Heidi (rule 4 is unconditional on Heidi)", () => {
    const persons = [leviWith(false), birgitWith([]), heidiWith([])];
    expect(resolveAutoProfile(persons, viennaTime("07:30"))).toBe("heidi");
  });

  it("never assumes a weekday pattern for Birgit — only her dated entries decide", () => {
    // Birgit has NO dated entry for today at all, even though today is a
    // normal Monday that would traditionally be a workday.
    const persons = [leviWith(true), birgitWith([]), heidiWith([])];
    expect(resolveAutoProfile(persons, viennaTime("07:00"))).toBe("levi"); // falls through, not Birgit
  });
});
