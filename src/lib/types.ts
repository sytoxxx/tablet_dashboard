export type PersonId = "levi" | "birgit" | "heidi";

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type TaskItem = {
  id: string;
  label: string;
  done: boolean;
  /** Only important open tasks surface on the morning dashboard. */
  important?: boolean;
};

export type SchoolLesson = {
  id: string;
  time: string;
  subject: string;
  room: string;
  bringItems?: string[];
};

export type SchoolDay = {
  lessons: SchoolLesson[];
};

export type WorkShiftDay = {
  label: string;
  start: string;
  end: string;
  location: string;
  notes?: string;
  bringItems?: string[];
};

export type PersonalBlock = {
  id: string;
  time: string;
  title: string;
  place: string;
  bringItems?: string[];
};

export type PersonalDay = {
  blocks: PersonalBlock[];
};

export type Schedule =
  | { type: "school"; week: Partial<Record<WeekdayKey, SchoolDay>> }
  | { type: "work"; week: Partial<Record<WeekdayKey, WorkShiftDay>> }
  | { type: "personal"; week: Partial<Record<WeekdayKey, PersonalDay>> };

export type Appointment = {
  id: string;
  title: string;
  time: string;
  /** If set, only on this weekday. */
  weekday?: WeekdayKey;
  /** Optional one-off ISO date YYYY-MM-DD. */
  date?: string;
};

export type BusDeparture = {
  id: string;
  line: string;
  destination: string;
  time: string;
};

export type BusProviderPreference =
  | "auto"
  | "verbund-steiermark"
  | "vao"
  | "wienerlinien"
  | "local"
  | "mock";

export type TransitModePreference = "bus" | "tram" | "subway" | "train" | "other";

/** How the person reaches school/work in the morning planner. */
export type TravelModePreference = "walking" | "bus";

/**
 * Home / start stop for a person.
 * Concrete StopPointRef / VAO id / RBL must be set in Admin — never invent.
 */
export type BusStop = {
  name: string;
  /** Local/mock timetable rows (fallback + offline). Marked as Testdaten in seed. */
  departures: BusDeparture[];
  /**
   * Provider-specific stop reference (StopPointRef / VAO id / Wiener Linien RBL).
   * Empty → use local `departures` only.
   */
  externalId?: string;
  provider?: BusProviderPreference;
};

/** Destination stop — configurable per person; do not hardcode production IDs. */
export type DestinationStop = {
  name: string;
  externalId?: string;
};

export type WeatherLocation = {
  place: string;
  latitude: number;
  longitude: number;
};

/** Deployable region defaults (Kapfenberg today — other places later). */
export type RegionConfig = {
  label: string;
  /** Free-text orientation, e.g. Zone 103 / Bruck & Kapfenberg. */
  notes?: string;
  defaultWeatherLocation: WeatherLocation;
  preferredBusProvider?: BusProviderPreference;
};

export type TransitPrefs = {
  /** When false, morning dashboards hide bus entirely. Default true. */
  enabled?: boolean;
  /**
   * Morning travel mode for leave-time planning.
   * Levi school: walking. Birgit/Heidi work: bus.
   */
  travelMode?: TravelModePreference;
  /**
   * Heuristic buffer (minutes) before work/school when no API arrival time exists.
   * Approximates ride duration — never invents per-connection travel times.
   */
  leadTimeMinutes: number;
  /** Optional HH:MM override; empty → use work/school start from schedule. */
  desiredArrivalHHmm?: string;
  /** Optional window end HH:MM (e.g. Levi 07:45–07:50). */
  desiredArrivalEndHHmm?: string;
  /** Friendly destination label for UI (e.g. “HTL Kapfenberg”). */
  destinationLabel?: string;
  preferredLines?: string[];
  preferredModes?: TransitModePreference[];
  /** Destination stop (name + optional provider id). */
  destinationStop?: DestinationStop;
  /**
   * Soft filter on departure destination text (e.g. "Bruck", "Apfelmoar").
   * Not a concrete stop id.
   */
  destinationHint?: string;
  /**
   * Walk minutes: home → start stop (bus mode) or home → destination (walking mode).
   * Configurable — never hardcode in UI.
   */
  walkToStopMinutes?: number;
  /** Walk minutes from destination stop to workplace (bus mode). */
  stopToWorkMinutes?: number;
  /** Minutes to get ready before leaving home (“langsam fertig werden”). */
  preparationMinutes?: number;
  /** Extra safety buffer before arrival target (minutes). */
  safetyBufferMinutes?: number;
};

export type WeatherDayGlance = {
  /** ISO date YYYY-MM-DD */
  dateIso: string;
  /** Mo–So short label derived client-side if needed */
  weekdayKey?: WeekdayKey;
  tempMaxC?: number;
  /** Daily low when provider supplies it — never invent. */
  tempMinC?: number;
  weatherCode?: number;
  /** 0–100 when known from forecast */
  rainProbPct?: number;
};

export type WeatherSettings = {
  summary: string;
  temperatureC: number;
  clothingTip: string;
  /** Optional ~afternoon sample when known from forecast/seed. */
  afternoonTempC?: number;
  /** Clock label for afternoonTempC, e.g. "14:00". */
  afternoonLabel?: string;
  /** WMO weather code when known. */
  weatherCode?: number;
  /** Rain probability 0–100 for “jetzt” when known. */
  rainProbPct?: number;
  /** Rain probability near afternoon sample. */
  afternoonRainProbPct?: number;
  /** Weather code near afternoon sample. */
  afternoonWeatherCode?: number;
  /** Compact Mo–So forecast when provider supplies it. */
  week?: WeatherDayGlance[];
};

export type PersonalSettings = {
  preferredCoffee?: string;
  notes?: string;
  /** Quiet leave reminder ~3 min before leaveHome. Default on. */
  leaveReminderEnabled?: boolean;
  /** Soft volume 0.02–0.25. Default ~0.08. */
  leaveReminderVolume?: number;
};

export type DisplayPrefs = {
  showBus: boolean;
  showWeather: boolean;
  showCalendar: boolean;
  showTasks: boolean;
};

/** Canonical persisted person record — single source for UI + later backend. */
export type PersonProfile = {
  id: PersonId;
  name: string;
  avatar: string;
  hint: string;
  greeting: string;
  accent: string;
  schedule: Schedule;
  appointments: Appointment[];
  busStop: BusStop | null;
  tasks: TaskItem[];
  defaultBringItems: string[];
  weather: WeatherSettings;
  personalSettings: PersonalSettings;
  displayPrefs: DisplayPrefs;
  /** Optional place for live weather (Open-Meteo). */
  weatherLocation?: WeatherLocation;
  /** Bus lead time relative to work/school start. */
  transitPrefs?: TransitPrefs;
};

export type CoffeeDrinkId = "espresso" | "cappuccino" | "latte";

export type CoffeeDrink = {
  id: CoffeeDrinkId;
  name: string;
  prepNotes: string;
  amounts: string;
  steps: string[];
  timerSeconds: number;
};

export type AppData = {
  version: 3;
  persons: PersonProfile[];
  coffeeDrinks: CoffeeDrink[];
  /** Current deployment region — configurable, not hardcoded in UI logic. */
  region?: RegionConfig;
  meta?: {
    exportedAt?: string;
    label?: string;
  };
};

/** Derived morning view for dashboards (not persisted). */
export type TimetableEntry = {
  time: string;
  subject: string;
  room: string;
};

export type WorkShift = {
  label: string;
  start: string;
  end: string;
  location: string;
  notes?: string;
};

export type BusInfo = {
  line: string;
  destination: string;
  /** Display departure HH:MM — realtime preferred when known. */
  departure: string;
  stopName: string;
  minutesUntil: number;
  /** true when chosen for work/school start, not just wall-clock next. */
  matchedToWork?: boolean;
  /**
   * true/false when arrival fit vs target is known;
   * null when unknown (do not invent travel time / do not assume punctual).
   */
  arrivesInTime?: boolean | null;
  /**
   * Estimated arrival at destination if the API provides it.
   * Never invent — leave undefined when unknown.
   */
  estimatedArrivalHHmm?: string;
  /** Planned departure HH:MM when known (may differ from realtime). */
  scheduledDeparture?: string;
  /** Realtime departure HH:MM when the provider supplies it. */
  realtimeDeparture?: string;
  /** Positive = late. Only set when provider reports delay — never invent. */
  delayMinutes?: number | null;
  /** True when this departure is cancelled / unusable. */
  cancelled?: boolean;
  /** True when departure time comes from realtime, not timetable alone. */
  isRealtime?: boolean;
  /** True for local/mock Testdaten — never label as live. */
  isTestData?: boolean;
  /** Normalized service status from provider mapping. */
  status?: "PLANNED" | "REALTIME" | "DELAYED" | "CANCELLED" | "UNKNOWN";
  /** ISO timestamp of last successful fetch (client may set). */
  fetchedAt?: string;
  /** ISO timestamp of realtime sample when distinct from fetch. */
  realtimeAt?: string;
  source?: "live" | "local" | "cache";
};

export type CalendarEvent = {
  time: string;
  title: string;
};

export type WeatherSnapshot = WeatherSettings & {
  rainMm?: number;
  tempMaxC?: number;
  tempMinC?: number;
  fetchedAt?: string;
  source?: "live" | "local" | "cache";
};

export type WeatherInfo = WeatherSnapshot;

export type TodayView = {
  id: PersonId;
  scheduleType: Schedule["type"];
  displayName: string;
  avatar: string;
  hint: string;
  greeting: string;
  accent: string;
  weekdayKey: WeekdayKey;
  timetable: TimetableEntry[];
  workShift: WorkShift | null;
  mitnehmen: string[];
  nextBus: BusInfo | null;
  busStopName: string | null;
  weather: WeatherInfo | null;
  calendar: CalendarEvent[];
  tasks: TaskItem[];
};

export type DataRepository = {
  load(): AppData;
  save(data: AppData): void;
  clear(): void;
};
