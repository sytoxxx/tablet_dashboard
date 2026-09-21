import { describe, expect, it } from "vitest";
import { buildEveningPrep } from "@/lib/evening/prep";
import {
  buildEveningChecklist,
  isEveningPrepComplete,
} from "@/lib/evening/checklist";
import { detectDayOutfitSignals } from "@/lib/outfit/day-signals";
import { resolveOutfitRecommendation } from "@/lib/outfit/engine";
import { defaultOutfitPreferences } from "@/lib/outfit/preferences";
import { rankWardrobeItemsForRotation } from "@/lib/outfit/rotation";
import { buildWeatherOutfitFactors } from "@/lib/outfit/weather-factors";
import type { WardrobeCatalog } from "@/lib/outfit/types";
import { getMorningOverview } from "@/lib/morning/overview";
import { resolveLeaveReminder } from "@/lib/morning/leave-reminder";
import { planTravel } from "@/lib/work/travel-planner";
import { seedAppData, seedPersons } from "@/data/seed";
import type { PersonProfile } from "@/lib/types";

function at(h: number, m: number, weekday = 1): Date {
  // 2026-09-14 is Monday
  const d = new Date(2026, 8, 14 + (weekday - 1), h, m, 0, 0);
  return d;
}

function person(id: "levi" | "birgit" | "heidi"): PersonProfile {
  return seedPersons.find((p) => p.id === id)!;
}

describe("evening prep for next day", () => {
  it("builds tomorrow prep (not today copy)", () => {
    // Monday evening → Tuesday plan
    const prep = buildEveningPrep({
      person: person("levi"),
      now: at(19, 0, 1),
      weather: {
        summary: "Regen",
        temperatureC: 9,
        clothingTip: "Jacke mitnehmen",
      },
    });
    expect(prep.date).toBe("2026-09-15");
    expect(prep.title).toMatch(/morgen/i);
    expect(prep.leaveHome).toBeTruthy();
    expect(prep.items.find((i) => i.kind === "bag")?.items?.length).toBeGreaterThan(0);
    expect(prep.items.find((i) => i.kind === "weather")?.detail).toMatch(/9°C|Regen|Jacke/i);
    expect(prep.items.find((i) => i.kind === "morning")?.detail).toMatch(/\d{2}:\d{2}/);
  });

  it("differs across persons", () => {
    const evening = at(19, 0, 1);
    const levi = buildEveningPrep({ person: person("levi"), now: evening });
    const birgit = buildEveningPrep({ person: person("birgit"), now: evening });
    const heidi = buildEveningPrep({ person: person("heidi"), now: evening });
    expect(levi.personId).toBe("levi");
    expect(birgit.personId).toBe("birgit");
    expect(heidi.personId).toBe("heidi");
    expect(levi.dayContext.kind).toBe("school");
    expect(birgit.dayContext.kind).toBe("work");
    expect(heidi.dayContext.kind).toBe("work");
    expect(levi.leaveHome).not.toBe(birgit.leaveHome);
  });

  it("differs across days for Levi", () => {
    // Sun evening → Monday (normal school)
    const mon = buildEveningPrep({ person: person("levi"), now: at(19, 0, 0) });
    // Tue evening → Wednesday (workshop)
    const wed = buildEveningPrep({ person: person("levi"), now: at(19, 0, 2) });
    expect(mon.signals.workshopDay).toBe(false);
    expect(wed.signals.workshopDay).toBe(true);
    expect(mon.outfit.ruleKind).not.toBe(wed.outfit.ruleKind);
  });
});

describe("workshop day rules (Levi)", () => {
  it("detects Werkstatt from schedule", () => {
    // Wednesday
    const signals = detectDayOutfitSignals({
      person: person("levi"),
      date: at(12, 0, 3),
    });
    expect(signals.workshopDay).toBe(true);
  });

  it("workshop rule has highest priority with red HTL shirt preference", () => {
    const prefs = defaultOutfitPreferences("levi");
    expect(prefs.workshop?.top.label).toMatch(/rotes htl/i);
    expect(prefs.workshop?.bottom.label).toMatch(/jogging/i);
    expect(prefs.workshop?.shoes.label).toMatch(/bequem|entspannt/i);

    const signals = detectDayOutfitSignals({
      person: person("levi"),
      date: at(12, 0, 3),
    });
    const { recommendation } = resolveOutfitRecommendation({
      personId: "levi",
      dateIso: "2026-09-16",
      signals,
      preferences: prefs,
    });
    expect(recommendation.ruleKind).toBe("mandatory_day");
    expect(recommendation.priority).toBe(1);
    expect(recommendation.blocksNormalOutfit).toBe(true);
    expect(recommendation.detail).toMatch(/HTL-T-Shirt/i);
    expect(recommendation.detail).toMatch(/Jogginghose/i);
    expect(recommendation.pieces.some((p) => p.slot === "shoes")).toBe(true);
  });

  it("workshop beats presentation + weather", () => {
    const signals = detectDayOutfitSignals({
      person: person("levi"),
      date: at(12, 0, 3),
      extraHints: ["Referat Physik"],
    });
    // workshop day still wins even if a presentation hint exists
    const { recommendation } = resolveOutfitRecommendation({
      personId: "levi",
      dateIso: "2026-09-16",
      signals: { ...signals, workshopDay: true, presentation: true },
      weather: { summary: "Regen", temperatureC: 5, clothingTip: "Winterjacke" },
    });
    expect(recommendation.ruleKind).toBe("mandatory_day");
  });
});

describe("presentation / Referat rules (Levi)", () => {
  it("detects Referat from appointments", () => {
    const signals = detectDayOutfitSignals({
      person: person("levi"),
      date: at(12, 0, 2), // Tuesday
    });
    expect(signals.presentation).toBe(true);
    expect(signals.presentationLabel).toMatch(/Referat/i);
  });

  it("recommends button-t-shirt category without inventing garments", () => {
    const { recommendation } = resolveOutfitRecommendation({
      personId: "levi",
      dateIso: "2026-09-15",
      signals: {
        workshopDay: false,
        presentation: true,
        presentationLabel: "Referat Elektrotechnik",
        schoolDay: true,
        workDay: false,
        lessonSubjects: ["Elektrotechnik"],
        appointmentTitles: ["Referat Elektrotechnik"],
      },
    });
    expect(recommendation.ruleKind).toBe("occasion");
    expect(recommendation.topCategory).toBe("button-t-shirt");
    expect(recommendation.pieces).toEqual([]);
    expect(recommendation.detail).toMatch(/Button-T-Shirt|Knopfleiste|Polo/i);
    expect(recommendation.detail).toMatch(/Kleiderschrank/i);
  });

  it("presentation overrides normal wardrobe-setup preference path", () => {
    const { recommendation } = resolveOutfitRecommendation({
      personId: "levi",
      dateIso: "2026-09-15",
      signals: {
        workshopDay: false,
        presentation: true,
        presentationLabel: "Referat",
        schoolDay: true,
        workDay: false,
        lessonSubjects: [],
        appointmentTitles: ["Referat"],
      },
    });
    expect(recommendation.ruleKind).toBe("occasion");
    expect(recommendation.priority).toBe(2);
  });
});

describe("rotation + no invented items", () => {
  it("considers last wear when ranking wardrobe items", () => {
    const catalog: WardrobeCatalog = {
      personId: "levi",
      items: [
        {
          id: "a",
          category: "top",
          label: "Blaues Shirt",
          wearCount: 5,
          lastWornIso: "2026-09-14",
        },
        {
          id: "b",
          category: "top",
          label: "Graues Shirt",
          wearCount: 1,
          lastWornIso: "2026-09-01",
        },
      ],
    };
    const prefs = defaultOutfitPreferences("levi");
    prefs.rotation.history = [
      {
        dateIso: "2026-09-14",
        itemIds: ["a"],
        styleTags: [],
        colors: [],
      },
    ];
    const ranked = rankWardrobeItemsForRotation({
      catalog,
      rotation: prefs.rotation,
      onDateIso: "2026-09-15",
      category: "top",
    });
    expect(ranked[0]?.id).toBe("b");
  });

  it("does not invent clothes, shoes, or perfume without catalog", () => {
    const prep = buildEveningPrep({
      person: person("levi"),
      now: at(19, 0, 0), // → Monday normal school
    });
    expect(prep.wardrobeReady).toBe(false);
    expect(prep.outfit.pieces).toEqual([]);
    expect(prep.items.find((i) => i.kind === "outfit")?.status).toBe(
      "unavailable",
    );
    expect(prep.items.find((i) => i.kind === "shoes")?.detail).toMatch(
      /nicht verfügbar|nicht eingerichtet/i,
    );
    expect(prep.items.find((i) => i.kind === "perfume")?.detail).toMatch(
      /Düfte|eingerichtet/i,
    );
  });

  it("weather is a factor without inventing garments", () => {
    const factors = buildWeatherOutfitFactors({
      summary: "Regen",
      temperatureC: 4,
      clothingTip: "Warme Jacke",
    });
    expect(factors.rain).toBe(true);
    expect(factors.morningTempC).toBe(4);
    expect(factors.guidance.join(" ")).toMatch(/kühl|Regen|Jacke/i);

    const { recommendation } = resolveOutfitRecommendation({
      personId: "levi",
      dateIso: "2026-09-14",
      signals: {
        workshopDay: false,
        presentation: false,
        presentationLabel: null,
        schoolDay: true,
        workDay: false,
        lessonSubjects: ["Mathematik"],
        appointmentTitles: [],
      },
      weather: { summary: "Regen", temperatureC: 4, clothingTip: "Warme Jacke" },
    });
    expect(recommendation.ruleKind).toBe("weather");
    expect(recommendation.detail).toMatch(/Kleiderschrank/i);
  });
});

describe("bag + leave time from existing planning", () => {
  it("bag comes from real bring list", () => {
    const prep = buildEveningPrep({
      person: person("levi"),
      now: at(19, 0, 1),
    });
    const bag = prep.items.find((i) => i.kind === "bag");
    expect(bag?.status).toBe("ready");
    expect(bag?.items?.some((x) => /Laptop|Taschenrechner|Wasser/i.test(x))).toBe(
      true,
    );
  });

  it("leave time comes from travel planner", () => {
    const tomorrow = at(12, 0, 2);
    const travel = planTravel({
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
      now: tomorrow,
    });
    const prep = buildEveningPrep({
      person: person("levi"),
      now: at(19, 0, 1),
      travelPlan: travel,
    });
    expect(prep.leaveHome).toBe(travel.leaveHome);
  });
});

describe("checklist", () => {
  it("tracks completion per person", () => {
    const items = buildEveningChecklist({
      personId: "levi",
      dateIso: "2026-09-15",
      checked: {
        outfit: true,
        shoes: true,
        perfume: true,
        bag: true,
        weather: true,
      },
    });
    expect(isEveningPrepComplete(items)).toBe(true);
    expect(
      isEveningPrepComplete(
        buildEveningChecklist({
          personId: "birgit",
          dateIso: "2026-09-15",
          checked: { outfit: true },
        }),
      ),
    ).toBe(false);
  });
});

describe("no regressions", () => {
  it("Phase-16 leave reminder still fires only in leave_soon window", () => {
    const travel = planTravel({
      personId: "levi",
      mode: "walking",
      arrivalTarget: "07:45",
      arrivalTargetEnd: "07:50",
      destinationLabel: "HTL",
      transitPrefs: {
        leadTimeMinutes: 10,
        walkToStopMinutes: 10,
        preparationMinutes: 5,
        safetyBufferMinutes: 0,
        travelMode: "walking",
      },
      now: at(6, 0),
    });
    expect(travel.leaveHome).toBe("07:35");
    const cue = resolveLeaveReminder({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 32),
      travel,
      timelineState: "leave_soon",
    });
    expect(cue.soundDue).toBe(true);
    expect(
      resolveLeaveReminder({
        personId: "levi",
        dateIso: "2026-09-14",
        now: at(7, 30),
        travel,
        timelineState: "prepare_soft",
      }).soundDue,
    ).toBe(false);
  });

  it("Levi has no bus; Birgit/Heidi keep work travel", () => {
    const levi = getMorningOverview("levi", at(7, 20), {
      person: person("levi"),
      data: seedAppData,
    });
    expect(levi.travelPlan?.mode).toBe("walking");
    expect(levi.bus.enabled).toBe(false);

    const busDeps = [
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
        line: "2",
        destination: "Arbeit [TEST]",
        time: "08:20",
        estimatedArrivalHHmm: "08:50",
      },
    ];
    const birgitPlan = planTravel({
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
      now: at(5, 0),
      stopName: "Start",
    });
    expect(birgitPlan.mode).toBe("bus");
    expect(birgitPlan.busDeparture).toBeTruthy();

    const heidiPlan = planTravel({
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
      departures: busDeps,
      now: at(6, 0),
      stopName: "Start",
    });
    expect(heidiPlan.mode).toBe("bus");
    expect(heidiPlan.leaveHome).toBeTruthy();
  });

  it("School Jarvis overview path still works for Levi", () => {
    const o = getMorningOverview("levi", at(7, 0), {
      person: person("levi"),
      data: seedAppData,
    });
    expect(o.personId).toBe("levi");
    expect(o.timeline).not.toBeNull();
  });
});

describe("evening prep — regression: tomorrow's context must use the real dated shift, not the weekday pattern", () => {
  it("shows 'off' for tomorrow when a dated entry marks it Frei, even though the weekday pattern has a shift", () => {
    const heidi = person("heidi");
    if (heidi.schedule.type !== "work") throw new Error("expected work schedule");
    // Monday evening -> Tuesday; Heidi's week pattern has a Tuesday shift ("Früher Termin").
    const withDatedFree: typeof heidi = {
      ...heidi,
      schedule: {
        ...heidi.schedule,
        entries: [
          { date: "2026-09-15", label: "Frei", start: "", end: "", location: "", status: "free" },
        ],
      },
    };
    const prep = buildEveningPrep({ person: withDatedFree, now: at(19, 0, 1) });
    expect(prep.date).toBe("2026-09-15");
    expect(prep.dayContext.kind).toBe("off");
  });

  it("shows tomorrow's real dated shift time, not the recurring weekday pattern's time", () => {
    const heidi = person("heidi");
    if (heidi.schedule.type !== "work") throw new Error("expected work schedule");
    // Week pattern for Tuesday is 08:30–16:30 ("Früher Termin") — the real
    // scanned roster says 07:15–15:00 for that exact date.
    const withDatedShift: typeof heidi = {
      ...heidi,
      schedule: {
        ...heidi.schedule,
        entries: [
          {
            date: "2026-09-15",
            label: "Vertretung",
            start: "07:15",
            end: "15:00",
            location: "Apfelmoar",
            status: "work",
          },
        ],
      },
    };
    const prep = buildEveningPrep({ person: withDatedShift, now: at(19, 0, 1) });
    expect(prep.dayContext.kind).toBe("work");
    expect(prep.dayContext.timeRange).toBe("07:15–15:00");
    expect(prep.dayContext.label).toBe("Vertretung");
  });

  it("without a dated override, still falls back to the recurring weekday pattern (no regression for Birgit)", () => {
    const birgit = person("birgit");
    const prep = buildEveningPrep({ person: birgit, now: at(19, 0, 1) });
    expect(prep.dayContext.kind).toBe("work");
    expect(prep.dayContext.timeRange).toBeTruthy();
  });
});
