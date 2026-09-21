import { describe, expect, it } from "vitest";
import { detectDayOutfitSignals } from "@/lib/outfit/day-signals";
import { seedPersons } from "@/data/seed";
import type { PersonProfile, WorkPlanEntry } from "@/lib/types";

function heidi(entries: WorkPlanEntry[] = []): PersonProfile {
  const base = seedPersons.find((p) => p.id === "heidi")!;
  if (base.schedule.type !== "work") throw new Error("expected work schedule");
  return { ...base, schedule: { ...base.schedule, entries } };
}

// 2026-09-15 is a Tuesday — Heidi's recurring week pattern has a shift then
// ("Früher Termin" 08:30–16:30).
const TUESDAY = new Date(2026, 8, 15, 12, 0, 0);

describe("detectDayOutfitSignals — regression: real dated entry must win over the recurring weekday pattern", () => {
  it("workDay is false when a dated entry marks the day off, even though the weekday pattern has a shift", () => {
    const person = heidi([
      { date: "2026-09-15", label: "Frei", start: "", end: "", location: "", status: "free" },
    ]);
    const signals = detectDayOutfitSignals({ person, date: TUESDAY });
    expect(signals.workDay).toBe(false);
  });

  it("workDay is true from a dated entry even when the weekday pattern has nothing (e.g. a special Saturday shift)", () => {
    // 2026-09-19 is a Saturday — Heidi's week pattern has no Saturday entry at all.
    const saturday = new Date(2026, 8, 19, 12, 0, 0);
    const person = heidi([
      { date: "2026-09-19", label: "Sonderdienst", start: "09:00", end: "13:00", location: "Apfelmoar", status: "work" },
    ]);
    const signals = detectDayOutfitSignals({ person, date: saturday });
    expect(signals.workDay).toBe(true);
  });

  it("workDay stays true from the weekday pattern when no dated entry overrides it", () => {
    const person = heidi([]);
    const signals = detectDayOutfitSignals({ person, date: TUESDAY });
    expect(signals.workDay).toBe(true);
  });

  it("collectDayTexts reflects the dated entry's own label, not the stale weekday-pattern label", () => {
    const person = heidi([
      { date: "2026-09-15", label: "Vertretung Zentrale", start: "07:00", end: "15:00", location: "X", status: "work" },
    ]);
    const signals = detectDayOutfitSignals({ person, date: TUESDAY });
    expect(signals.appointmentTitles).toContain("Vertretung Zentrale");
    expect(signals.appointmentTitles).not.toContain("Früher Termin");
  });
});
