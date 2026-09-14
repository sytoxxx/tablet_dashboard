import type {
  DisplayPrefs,
  PersonProfile,
  RegionConfig,
  TransitPrefs,
  WeatherLocation,
} from "@/lib/types";

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  showBus: true,
  showWeather: true,
  showCalendar: true,
  showTasks: true,
};

export const DEFAULT_TRANSIT_PREFS: TransitPrefs = {
  enabled: true,
  leadTimeMinutes: 30,
  walkToStopMinutes: 0,
  stopToWorkMinutes: 0,
  preparationMinutes: 0,
  safetyBufferMinutes: 5,
};

/** Kapfenberg, Steiermark — current home base; override per person / region. */
export const KAPFENBERG_WEATHER_LOCATION: WeatherLocation = {
  place: "Kapfenberg",
  latitude: 47.4442,
  longitude: 15.2932,
};

export const DEFAULT_WEATHER_LOCATION: WeatherLocation = KAPFENBERG_WEATHER_LOCATION;

export const DEFAULT_REGION: RegionConfig = {
  label: "Kapfenberg / Bruck an der Mur / Apfelmoar",
  notes:
    "Stadtverkehr Bruck & Kapfenberg (Zone 103). Orientierung: Apfelmoar · Schirmitzbühel · Kapfenberg Europaplatz · Bruck/Mur Bahnhof · Koloman-Wallisch-Platz. Konkrete Haltestellen nur im Admin setzen.",
  defaultWeatherLocation: KAPFENBERG_WEATHER_LOCATION,
  preferredBusProvider: "auto",
};

export function withDisplayPrefs(person: PersonProfile): PersonProfile {
  return {
    ...person,
    displayPrefs: {
      ...DEFAULT_DISPLAY_PREFS,
      ...person.displayPrefs,
    },
    transitPrefs: {
      ...DEFAULT_TRANSIT_PREFS,
      ...person.transitPrefs,
    },
    weatherLocation: person.weatherLocation ?? DEFAULT_WEATHER_LOCATION,
  };
}
