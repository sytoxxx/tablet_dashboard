import { describe, expect, it } from "vitest";
import {
  formatWeekDayRain,
  formatWeekDayTemps,
} from "@/components/person/weather-section";
import type { WeatherDayGlance } from "@/lib/types";

function day(partial: Partial<WeatherDayGlance>): WeatherDayGlance {
  return {
    dateIso: partial.dateIso ?? "2026-09-15",
    weekdayKey: partial.weekdayKey ?? "mon",
    ...partial,
  };
}

describe("formatWeekDayTemps", () => {
  it("shows high / low when both known", () => {
    expect(
      formatWeekDayTemps(day({ tempMaxC: 18, tempMinC: 9 })),
    ).toBe("18° / 9°");
  });

  it("shows high only when min missing — never invents", () => {
    expect(formatWeekDayTemps(day({ tempMaxC: 20 }))).toBe("20°");
  });

  it("shows dash when neither temp known", () => {
    expect(formatWeekDayTemps(day({}))).toBe("–");
  });
});

describe("formatWeekDayRain", () => {
  it("formats percent with space", () => {
    expect(formatWeekDayRain(10)).toBe("10 %");
    expect(formatWeekDayRain(0)).toBe("0 %");
  });

  it("dash when rain unknown", () => {
    expect(formatWeekDayRain(undefined)).toBe("–");
  });
});
