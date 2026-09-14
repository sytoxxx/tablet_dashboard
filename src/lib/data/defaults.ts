import type { DisplayPrefs, PersonProfile, TransitPrefs, WeatherLocation } from "@/lib/types";

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  showBus: true,
  showWeather: true,
  showCalendar: true,
  showTasks: true,
};

export const DEFAULT_TRANSIT_PREFS: TransitPrefs = {
  leadTimeMinutes: 30,
};

export const DEFAULT_WEATHER_LOCATION: WeatherLocation = {
  place: "Wien",
  latitude: 48.2082,
  longitude: 16.3738,
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
