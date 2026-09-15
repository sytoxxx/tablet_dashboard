import { describe, expect, it } from "vitest";
import {
  greetingSnapshot,
  msUntilNextGreetingBucket,
  personalizedGreeting,
  resolveDaypart,
  resolveGreetingBucket,
} from "@/lib/day/greeting";

function at(hour: number, minute = 0): Date {
  return new Date(2026, 8, 15, hour, minute, 0, 0);
}

describe("resolveGreetingBucket", () => {
  it("maps morning / day / evening / night", () => {
    expect(resolveGreetingBucket(at(5))).toBe("morning");
    expect(resolveGreetingBucket(at(11, 59))).toBe("morning");
    expect(resolveGreetingBucket(at(12))).toBe("day");
    expect(resolveGreetingBucket(at(17, 59))).toBe("day");
    expect(resolveGreetingBucket(at(18))).toBe("evening");
    expect(resolveGreetingBucket(at(21, 59))).toBe("evening");
    expect(resolveGreetingBucket(at(22))).toBe("night");
    expect(resolveGreetingBucket(at(3))).toBe("night");
  });
});

describe("greetingSnapshot", () => {
  it("includes emoji + salutation + name", () => {
    expect(greetingSnapshot(at(7)).line("Levi")).toBe("☀️ Guten Morgen, Levi");
    expect(greetingSnapshot(at(13)).line("Birgit")).toBe("🌤️ Guten Tag, Birgit");
    expect(greetingSnapshot(at(19)).line("Heidi")).toBe("🌆 Guten Abend, Heidi");
    expect(greetingSnapshot(at(23)).line("Levi")).toBe("🌙 Gute Nacht, Levi");
  });
});

describe("msUntilNextGreetingBucket", () => {
  it("schedules to next boundary", () => {
    const wait = msUntilNextGreetingBucket(at(10, 30));
    // 10:30 → 12:00 = 90 minutes
    expect(wait).toBe(90 * 60_000);
  });

  it("wraps night to 05:00", () => {
    const wait = msUntilNextGreetingBucket(at(23, 0));
    // 23:00 → 05:00 next day = 6h
    expect(wait).toBe(6 * 60 * 60_000);
  });
});

describe("legacy daypart", () => {
  it("folds night into evening", () => {
    expect(resolveDaypart(at(7))).toBe("morning");
    expect(resolveDaypart(at(14))).toBe("day");
    expect(resolveDaypart(at(20))).toBe("evening");
    expect(resolveDaypart(at(23))).toBe("evening");
  });

  it("personalizedGreeting matches snapshot", () => {
    expect(personalizedGreeting("Levi", at(8))).toBe(
      greetingSnapshot(at(8)).line("Levi"),
    );
  });
});
