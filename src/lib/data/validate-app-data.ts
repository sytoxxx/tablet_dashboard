import type {
  AppData,
  BusProviderPreference,
  DestinationStop,
  PersonId,
  PersonProfile,
  RegionConfig,
  Schedule,
  TransitModePreference,
  TransitPrefs,
  WeatherLocation,
} from "@/lib/types";
import {
  DEFAULT_DISPLAY_PREFS,
  DEFAULT_REGION,
  DEFAULT_TRANSIT_PREFS,
  DEFAULT_WEATHER_LOCATION,
} from "@/lib/data/defaults";
import { seedAppData } from "@/data/seed";

const PERSON_IDS: PersonId[] = ["levi", "birgit", "heidi"];
const BUS_PROVIDERS: BusProviderPreference[] = [
  "auto",
  "verbund-steiermark",
  "vao",
  "wienerlinien",
  "local",
  "mock",
];
const TRANSIT_MODES: TransitModePreference[] = [
  "bus",
  "tram",
  "subway",
  "train",
  "other",
];

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

function sanitizeTransitPrefs(raw: unknown, fallback?: TransitPrefs): TransitPrefs {
  const base = { ...DEFAULT_TRANSIT_PREFS, ...fallback };
  if (!isObject(raw)) return base;
  const lead =
    typeof raw.leadTimeMinutes === "number"
      ? Math.min(180, Math.max(5, raw.leadTimeMinutes))
      : base.leadTimeMinutes;
  const desired =
    typeof raw.desiredArrivalHHmm === "string" &&
    /^\d{2}:\d{2}$/.test(raw.desiredArrivalHHmm.trim())
      ? raw.desiredArrivalHHmm.trim()
      : base.desiredArrivalHHmm;
  const preferredLines = Array.isArray(raw.preferredLines)
    ? raw.preferredLines
        .filter((l): l is string => typeof l === "string")
        .map((l) => l.replace(/[<>]/g, "").slice(0, 16))
        .filter(Boolean)
        .slice(0, 8)
    : base.preferredLines;
  const preferredModes = Array.isArray(raw.preferredModes)
    ? raw.preferredModes.filter((m): m is TransitModePreference =>
        TRANSIT_MODES.includes(m as TransitModePreference),
      )
    : base.preferredModes;
  let destinationStop: DestinationStop | undefined = base.destinationStop;
  if (isObject(raw.destinationStop)) {
    const name = sanitizeString(raw.destinationStop.name, "", 80);
    if (name) {
      destinationStop = {
        name,
        externalId:
          typeof raw.destinationStop.externalId === "string"
            ? raw.destinationStop.externalId.replace(/[<>\s]/g, "").slice(0, 64) ||
              undefined
            : undefined,
      };
    }
  }
  const destinationHint =
    typeof raw.destinationHint === "string"
      ? sanitizeString(raw.destinationHint, "", 40) || undefined
      : base.destinationHint;

  const clampMin = (value: unknown, fallback: number, max = 180) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(max, Math.max(0, Math.trunc(value)))
      : fallback;

  return {
    leadTimeMinutes: lead,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : (base.enabled ?? true),
    desiredArrivalHHmm: desired,
    preferredLines: preferredLines?.length ? preferredLines : undefined,
    preferredModes: preferredModes?.length ? preferredModes : undefined,
    destinationStop,
    destinationHint,
    walkToStopMinutes: clampMin(
      raw.walkToStopMinutes,
      base.walkToStopMinutes ?? 0,
    ),
    stopToWorkMinutes: clampMin(
      raw.stopToWorkMinutes,
      base.stopToWorkMinutes ?? 0,
    ),
    preparationMinutes: clampMin(
      raw.preparationMinutes,
      base.preparationMinutes ?? 0,
    ),
    safetyBufferMinutes: clampMin(
      raw.safetyBufferMinutes,
      base.safetyBufferMinutes ?? 5,
    ),
  };
}

function sanitizeBusStop(
  raw: unknown,
  fallback: PersonProfile["busStop"],
): PersonProfile["busStop"] {
  if (raw === null) return null;
  if (!isObject(raw)) return fallback;
  const name = sanitizeString(raw.name, fallback?.name ?? "Haltestelle", 80);
  const externalId =
    typeof raw.externalId === "string"
      ? raw.externalId.replace(/[<>\s]/g, "").slice(0, 64) || undefined
      : fallback?.externalId;
  const provider =
    typeof raw.provider === "string" &&
    BUS_PROVIDERS.includes(raw.provider as BusProviderPreference)
      ? (raw.provider as BusProviderPreference)
      : (fallback?.provider ?? "local");
  const departures = Array.isArray(raw.departures)
    ? (raw.departures as NonNullable<PersonProfile["busStop"]>["departures"]).slice(0, 48)
    : (fallback?.departures ?? []);
  return {
    name,
    departures,
    externalId,
    provider,
  };
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
    busStop: sanitizeBusStop(raw.busStop, fallback.busStop),
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
          notes: sanitizeString(
            raw.personalSettings.notes,
            fallback.personalSettings.notes ?? "",
            200,
          ),
        }
      : fallback.personalSettings,
    displayPrefs: {
      ...DEFAULT_DISPLAY_PREFS,
      ...(isObject(raw.displayPrefs)
        ? (raw.displayPrefs as Partial<typeof DEFAULT_DISPLAY_PREFS>)
        : {}),
    },
    transitPrefs: sanitizeTransitPrefs(raw.transitPrefs, fallback.transitPrefs),
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

function sanitizeRegion(raw: unknown, fallback?: RegionConfig): RegionConfig {
  const base = fallback ?? DEFAULT_REGION;
  if (!isObject(raw)) return base;
  const preferred =
    typeof raw.preferredBusProvider === "string" &&
    BUS_PROVIDERS.includes(raw.preferredBusProvider as BusProviderPreference)
      ? (raw.preferredBusProvider as BusProviderPreference)
      : base.preferredBusProvider;
  return {
    label: sanitizeString(raw.label, base.label, 120),
    notes:
      typeof raw.notes === "string"
        ? sanitizeString(raw.notes, base.notes ?? "", 400) || undefined
        : base.notes,
    defaultWeatherLocation: sanitizeWeatherLocation(
      raw.defaultWeatherLocation,
      base.defaultWeatherLocation,
    )!,
    preferredBusProvider: preferred,
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
      region: sanitizeRegion(raw.region, seedAppData.region ?? DEFAULT_REGION),
      meta: isObject(raw.meta)
        ? {
            exportedAt: sanitizeString(raw.meta.exportedAt, "", 40) || undefined,
            label: sanitizeString(raw.meta.label, "", 80) || undefined,
          }
        : undefined,
    },
  };
}

export function migrateAppData(
  raw: AppData | (Omit<AppData, "version"> & { version: 2 }),
): AppData {
  const persons = raw.persons.map((p) => ({
    ...p,
    displayPrefs: {
      ...DEFAULT_DISPLAY_PREFS,
      ...(p as PersonProfile).displayPrefs,
    },
    transitPrefs: sanitizeTransitPrefs(
      (p as PersonProfile).transitPrefs,
      (p as PersonProfile).transitPrefs,
    ),
    weatherLocation: (p as PersonProfile).weatherLocation ?? DEFAULT_WEATHER_LOCATION,
  }));
  return {
    version: 3,
    persons,
    coffeeDrinks: raw.coffeeDrinks,
    region: sanitizeRegion((raw as AppData).region, DEFAULT_REGION),
    meta: (raw as AppData).meta,
  };
}
