import type { DisplayPrefs, PersonProfile } from "@/lib/types";

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  showBus: true,
  showWeather: true,
  showCalendar: true,
  showTasks: true,
};

export function withDisplayPrefs(person: PersonProfile): PersonProfile {
  return {
    ...person,
    displayPrefs: {
      ...DEFAULT_DISPLAY_PREFS,
      ...person.displayPrefs,
    },
  };
}
