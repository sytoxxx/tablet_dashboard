import { describe, expect, it } from "vitest";
import {
  detailedClothingLayers,
  isValidTempC,
  pickNearestAfternoonTemp,
  shortWeatherClothingTip,
} from "@/lib/weather/clothing";
import { buildWorkWeekGlance } from "@/lib/work/schedule";
import type { WorkShiftDay } from "@/lib/types";

describe("shortWeatherClothingTip", () => {
  it("mild → thin jacket", () => {
    expect(shortWeatherClothingTip({ temperatureC: 16 })).toBe(
      "Eine dünne Jacke reicht.",
    );
  });

  it("cool → jacket recommended", () => {
    expect(shortWeatherClothingTip({ temperatureC: 10 })).toMatch(
      /Jacke empfehlenswert/i,
    );
  });

  it("warm → no coat", () => {
    expect(shortWeatherClothingTip({ temperatureC: 23 })).toMatch(
      /Kein Mantel/i,
    );
  });

  it("rain → jacket", () => {
    expect(
      shortWeatherClothingTip({
        temperatureC: 14,
        rainMm: 1.2,
        weatherCode: 61,
      }),
    ).toMatch(/Jacke/i);
  });
});

describe("detailedClothingLayers", () => {
  it("returns multi-item line", () => {
    expect(detailedClothingLayers({ temperatureC: 16 })).toMatch(
      /Leichte Jacke · lange Hose ·/,
    );
  });
});

describe("pickNearestAfternoonTemp", () => {
  it("picks 14:00 when present", () => {
    const r = pickNearestAfternoonTemp(
      [
        "2026-09-15T12:00",
        "2026-09-15T14:00",
        "2026-09-15T16:00",
      ],
      [18, 23, 21],
      14,
    );
    expect(r).toEqual({ tempC: 23, label: "14:00", index: 1 });
  });

  it("labels nearest hour when 14:00 missing", () => {
    const r = pickNearestAfternoonTemp(
      ["2026-09-15T13:00", "2026-09-15T15:00"],
      [20, 22],
      14,
    );
    expect(r?.label).toBe("13:00");
    expect(r?.tempC).toBe(20);
    expect(r?.index).toBe(0);
  });

  it("returns null when no samples", () => {
    expect(pickNearestAfternoonTemp([], [], 14)).toBeNull();
    expect(pickNearestAfternoonTemp(undefined, undefined, 14)).toBeNull();
  });

  it("skips null temps", () => {
    const r = pickNearestAfternoonTemp(
      ["2026-09-15T14:00", "2026-09-15T15:00"],
      [null, 19],
      14,
    );
    expect(r).toEqual({ tempC: 19, label: "15:00", index: 1 });
  });
});

describe("isValidTempC", () => {
  it("rejects null/NaN/undefined", () => {
    expect(isValidTempC(null)).toBe(false);
    expect(isValidTempC(undefined)).toBe(false);
    expect(isValidTempC(Number.NaN)).toBe(false);
    expect(isValidTempC(0)).toBe(true);
    expect(isValidTempC(18)).toBe(true);
  });
});

describe("buildWorkWeekGlance", () => {
  const week: Partial<Record<string, WorkShiftDay>> = {
    mon: {
      label: "Frühschicht",
      start: "06:00",
      end: "14:00",
      location: "Bruck",
    },
    tue: {
      label: "Frühschicht",
      start: "06:00",
      end: "14:00",
      location: "Bruck",
    },
    wed: {
      label: "Frei",
      start: "",
      end: "",
      location: "",
    },
  };

  it("marks Arbeit with hours, Frei when explicit, Keine Daten when missing", () => {
    const today = new Date(2026, 8, 14); // Monday
    const days = buildWorkWeekGlance(week, today);
    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({
      day: "mon",
      statusLabel: "Arbeit",
      hours: "06:00–14:00",
      isToday: true,
    });
    expect(days[2]).toMatchObject({
      day: "wed",
      statusLabel: "Frei",
      hours: null,
    });
    expect(days[5]).toMatchObject({
      day: "sat",
      statusLabel: "Keine Daten",
    });
    expect(days[6].statusLabel).toBe("Keine Daten");
  });

  it("never invents Frei for absent weekend keys", () => {
    const days = buildWorkWeekGlance(
      { mon: week.mon! },
      new Date(2026, 8, 19),
    );
    expect(days.find((d) => d.day === "sat")?.statusLabel).toBe("Keine Daten");
    expect(days.find((d) => d.day === "sun")?.statusLabel).toBe("Keine Daten");
  });
});
