import type { AppData, PersonId, PersonProfile, Schedule, WeatherLocation } from "@/lib/types";
import {
  DEFAULT_DISPLAY_PREFS,
  DEFAULT_TRANSIT_PREFS,
  DEFAULT_WEATHER_LOCATION,
} from "@/lib/data/defaults";
import { seedAppData } from "@/data/seed";

const PERSON_IDS: PersonId[] = ["levi", "birgit", "heidi"];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeString(value: unknown, fallback: string, max = 120): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[<>]/g, "").trim().slice(0, max);
  return cleaned || fallback;
}

function sanitizeSchedule(raw: unknown, fallback: Schedule): Schedule {
  if (!isObject(raw)) return fallback;
  const type = raw.type;
  if (type !== "school" && type !== "work" && type !== "personal") return fallback;
  const week = isObject(raw.week) ? raw.week : {};
  return { type, week: week as Schedule["week"] } as Schedule;
}

function sanitizePerson(raw: unknown, fallback: PersonProfile): PersonProfile | null {
  if (!isObject(raw)) return null;
  const id = raw.id;
  if (id !== "levi" && id !== "birgit" && id !== "heidi") return null;

  return {
    ...fallback,
    id,
    name: sanitizeString(raw.name, fallback.name, 40),
    avatar: sanitizeString(raw.avatar, fallback.avatar, 2),
    hint: sanitizeString(raw.hint, fallback.hint, 60),
    greeting: sanitizeString(raw.greeting, fallback.greeting, 80),
    accent: sanitizeString(raw.accent, fallback.accent, 20),
    schedule: sanitizeSchedule(raw.schedule, fallback.schedule),
    appointments: Array.isArray(raw.appointments)
      ? (raw.appointments as PersonProfile["appointments"]).slice(0, 100)
      : fallback.appointments,
    busStop: (raw.busStop as PersonProfile["busStop"]) ?? fallback.busStop,
    tasks: Array.isArray(raw.tasks)
      ? (raw.tasks as PersonProfile["tasks"]).slice(0, 100)
      : fallback.tasks,
    defaultBringItems: Array.isArray(raw.defaultBringItems)
      ? (raw.defaultBringItems as string[]).map((s) => sanitizeString(s, "", 40)).filter(Boolean)
      : fallback.defaultBringItems,
    weather: isObject(raw.weather)
      ? {
          summary: sanitizeString(raw.weather.summary, fallback.weather.summary, 80),
          temperatureC:
            typeof raw.weather.temperatureC === "number"
              ? raw.weather.temperatureC
              : fallback.weather.temperatureC,
          clothingTip: sanitizeString(
            raw.weather.clothingTip,
            fallback.weather.clothingTip,
            160,
          ),
        }
      : fallback.weather,
    personalSettings: isObject(raw.personalSettings)
      ? {
          preferredCoffee: sanitizeString(
            raw.personalSettings.preferredCoffee,
            fallback.personalSettings.preferredCoffee ?? "",
            40,
          ),
          notes: sanitizeString(raw.personalSettings.notes, fallback.personalSettings.notes ?? "", 200),
        }
      : fallback.personalSettings,
    displayPrefs: {
      ...DEFAULT_DISPLAY_PREFS,
      ...(isObject(raw.displayPrefs) ? (raw.displayPrefs as Partial<typeof DEFAULT_DISPLAY_PREFS>) : {}),
    },
    transitPrefs: {
      ...DEFAULT_TRANSIT_PREFS,
      ...(isObject(raw.transitPrefs)
        ? {
            leadTimeMinutes:
              typeof (raw.transitPrefs as { leadTimeMinutes?: number }).leadTimeMinutes ===
              "number"
                ? Math.min(
                    180,
                    Math.max(
                      5,
                      (raw.transitPrefs as { leadTimeMinutes: number }).leadTimeMinutes,
                    ),
                  )
                : DEFAULT_TRANSIT_PREFS.leadTimeMinutes,
          }
        : {}),
    },
    weatherLocation: sanitizeWeatherLocation(raw.weatherLocation, fallback.weatherLocation),
  };
}

function sanitizeWeatherLocation(
  raw: unknown,
  fallback?: WeatherLocation,
): WeatherLocation | undefined {
  const base = fallback ?? DEFAULT_WEATHER_LOCATION;
  if (!isObject(raw)) return base;
  const latitude = typeof raw.latitude === "number" ? raw.latitude : base.latitude;
  const longitude = typeof raw.longitude === "number" ? raw.longitude : base.longitude;
  return {
    place: sanitizeString(raw.place, base.place, 60),
    latitude,
    longitude,
  };
}

/** Validate + sanitize imported JSON. Rejects unsafe/oversized payloads. */
export function validateAppDataImport(
  raw: unknown,
): { ok: true; data: AppData } | { ok: false; error: string } {
  if (!isObject(raw)) return { ok: false, error: "Ungültiges JSON-Objekt." };
  const version = raw.version;
  if (version !== 2 && version !== 3) {
    return { ok: false, error: "Nicht unterstützte Datenversion." };
  }
  if (!Array.isArray(raw.persons) || raw.persons.length === 0) {
    return { ok: false, error: "Personen fehlen." };
  }
  if (raw.persons.length > 10) {
    return { ok: false, error: "Zu viele Personen im Import." };
  }

  const seedById = new Map(seedAppData.persons.map((p) => [p.id, p]));
  const persons: PersonProfile[] = [];

  for (const entry of raw.persons) {
    if (!isObject(entry)) continue;
    const id = entry.id as PersonId;
    if (!PERSON_IDS.includes(id)) continue;
    const fallback = seedById.get(id);
    if (!fallback) continue;
    const person = sanitizePerson(entry, fallback);
    if (person) persons.push(person);
  }

  // Ensure all three core profiles exist
  for (const id of PERSON_IDS) {
    if (!persons.some((p) => p.id === id)) {
      const seed = seedById.get(id);
      if (seed) persons.push(structuredClone(seed));
    }
  }

  const coffeeDrinks = Array.isArray(raw.coffeeDrinks)
    ? (raw.coffeeDrinks as AppData["coffeeDrinks"]).slice(0, 20)
    : structuredClone(seedAppData.coffeeDrinks);

  return {
    ok: true,
    data: {
      version: 3,
      persons,
      coffeeDrinks,
      meta: isObject(raw.meta)
        ? {
            exportedAt: sanitizeString(raw.meta.exportedAt, "", 40) || undefined,
            label: sanitizeString(raw.meta.label, "", 80) || undefined,
          }
        : undefined,
    },
  };
}

export function migrateAppData(raw: AppData | (Omit<AppData, "version"> & { version: 2 })): AppData {
  const persons = raw.persons.map((p) => ({
    ...p,
    displayPrefs: {
      ...DEFAULT_DISPLAY_PREFS,
      ...(p as PersonProfile).displayPrefs,
    },
    transitPrefs: {
      ...DEFAULT_TRANSIT_PREFS,
      ...(p as PersonProfile).transitPrefs,
    },
    weatherLocation: (p as PersonProfile).weatherLocation ?? DEFAULT_WEATHER_LOCATION,
  }));
  return {
    version: 3,
    persons,
    coffeeDrinks: raw.coffeeDrinks,
    meta: (raw as AppData).meta,
  };
}
