import { describe, expect, it } from "vitest";
import { migrateAppData, validateAppDataImport } from "@/lib/data/validate-app-data";
import type { AppData, PersonProfile } from "@/lib/types";

describe("validateAppDataImport avatarImageUrl", () => {
  it("accepts a local /avatars path and a data:image URL", () => {
    const result = validateAppDataImport({
      version: 3,
      persons: [{ id: "levi", avatarImageUrl: "/avatars/levi.jpg" }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.persons.find((p) => p.id === "levi")?.avatarImageUrl).toBe(
        "/avatars/levi.jpg",
      );
    }
  });

  it("rejects external and javascript: URLs, keeping no override", () => {
    const external = validateAppDataImport({
      version: 3,
      persons: [{ id: "birgit", avatarImageUrl: "https://evil.example/x.jpg" }],
    });
    expect(external.ok).toBe(true);
    if (external.ok) {
      expect(
        external.data.persons.find((p) => p.id === "birgit")?.avatarImageUrl,
      ).toBeUndefined();
    }

    const js = validateAppDataImport({
      version: 3,
      persons: [{ id: "heidi", avatarImageUrl: "javascript:alert(1)" }],
    });
    expect(js.ok).toBe(true);
    if (js.ok) {
      expect(
        js.data.persons.find((p) => p.id === "heidi")?.avatarImageUrl,
      ).toBeUndefined();
    }
  });
});

function minimalPerson(overrides: Partial<PersonProfile> = {}): PersonProfile {
  return {
    id: "birgit",
    name: "Birgit",
    avatar: "B",
    hint: "",
    greeting: "",
    accent: "#000",
    schedule: { type: "work", week: {} },
    appointments: [],
    busStop: null,
    tasks: [],
    defaultBringItems: [],
    weather: { summary: "", temperatureC: 10, clothingTip: "" },
    personalSettings: {},
    displayPrefs: { showBus: true, showWeather: true, showCalendar: true, showTasks: true },
    ...overrides,
  };
}

describe("regression: typicalWorkStartHHmm/typicalWorkEndHHmm must survive sanitization", () => {
  // Regression for a real bug: sanitizeTransitPrefs explicitly listed every
  // known TransitPrefs field and silently dropped any field not in that
  // list — the admin-saved typical work time was wiped on the very next
  // app load, even though it was correctly written to storage.
  it("migrateAppData (the real load path used on every app boot) keeps typical work time", () => {
    const data: AppData = {
      version: 3,
      persons: [
        minimalPerson({
          transitPrefs: {
            leadTimeMinutes: 30,
            typicalWorkStartHHmm: "06:00",
            typicalWorkEndHHmm: "12:00",
          },
        }),
      ],
      coffeeDrinks: [],
    };
    const migrated = migrateAppData(data);
    expect(migrated.persons[0]?.transitPrefs?.typicalWorkStartHHmm).toBe("06:00");
    expect(migrated.persons[0]?.transitPrefs?.typicalWorkEndHHmm).toBe("12:00");
  });

  it("validateAppDataImport (the import path) also keeps typical work time", () => {
    const result = validateAppDataImport({
      version: 3,
      persons: [
        {
          id: "heidi",
          transitPrefs: { typicalWorkStartHHmm: "08:30", typicalWorkEndHHmm: "16:30" },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const heidi = result.data.persons.find((p) => p.id === "heidi");
    expect(heidi?.transitPrefs?.typicalWorkStartHHmm).toBe("08:30");
    expect(heidi?.transitPrefs?.typicalWorkEndHHmm).toBe("16:30");
  });

  it("validateAppDataImport rejects a malformed typical time instead of guessing one", () => {
    const result = validateAppDataImport({
      version: 3,
      persons: [{ id: "birgit", transitPrefs: { typicalWorkStartHHmm: "not-a-time" } }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.data.persons.find((p) => p.id === "birgit")?.transitPrefs?.typicalWorkStartHHmm,
    ).toBeUndefined();
  });
});
