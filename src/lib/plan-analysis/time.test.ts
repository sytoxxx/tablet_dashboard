import { describe, expect, it } from "vitest";
import { normalizeTimeToken, parseTimeRangeToken } from "@/lib/plan-analysis/time";

describe("normalizeTimeToken", () => {
  it("accepts already-strict HH:MM", () => {
    expect(normalizeTimeToken("06:00")).toBe("06:00");
    expect(normalizeTimeToken("23:59")).toBe("23:59");
  });

  it("accepts a dot separator", () => {
    expect(normalizeTimeToken("06.00")).toBe("06:00");
    expect(normalizeTimeToken("6.00")).toBe("06:00");
  });

  it("accepts a single-digit hour with a colon", () => {
    expect(normalizeTimeToken("6:00")).toBe("06:00");
  });

  it("accepts a 4-digit no-separator token", () => {
    expect(normalizeTimeToken("0600")).toBe("06:00");
    expect(normalizeTimeToken("1400")).toBe("14:00");
  });

  it("accepts 'H Uhr' / 'Hh'", () => {
    expect(normalizeTimeToken("6 Uhr")).toBe("06:00");
    expect(normalizeTimeToken("14 Uhr")).toBe("14:00");
  });

  it("refuses a bare number — genuinely ambiguous on its own", () => {
    expect(normalizeTimeToken("6")).toBeNull();
    expect(normalizeTimeToken("14")).toBeNull();
  });

  it("refuses garbage / empty / non-string input", () => {
    expect(normalizeTimeToken("")).toBeNull();
    expect(normalizeTimeToken("abc")).toBeNull();
    expect(normalizeTimeToken(undefined)).toBeNull();
    expect(normalizeTimeToken(600)).toBeNull();
  });

  it("refuses an out-of-range hour/minute", () => {
    expect(normalizeTimeToken("25:00")).toBeNull();
    expect(normalizeTimeToken("12:75")).toBeNull();
  });
});

describe("parseTimeRangeToken", () => {
  it("splits a colon-separated range with high confidence", () => {
    expect(parseTimeRangeToken("06:00-14:00")).toEqual({
      start: "06:00",
      end: "14:00",
      confident: true,
    });
  });

  it("splits a dot-separated range with an en-dash", () => {
    expect(parseTimeRangeToken("06.00–14.00")).toEqual({
      start: "06:00",
      end: "14:00",
      confident: true,
    });
  });

  it("splits a 'bis' range", () => {
    expect(parseTimeRangeToken("08:00 bis 16:00")).toEqual({
      start: "08:00",
      end: "16:00",
      confident: true,
    });
  });

  it("splits a bare hour-only range but marks it low-confidence", () => {
    expect(parseTimeRangeToken("6-14")).toEqual({ start: "06:00", end: "14:00", confident: false });
    expect(parseTimeRangeToken("06-14")).toEqual({
      start: "06:00",
      end: "14:00",
      confident: false,
    });
  });

  it("refuses a non-range token", () => {
    expect(parseTimeRangeToken("Frei")).toBeNull();
    expect(parseTimeRangeToken("06:00")).toBeNull();
  });
});
