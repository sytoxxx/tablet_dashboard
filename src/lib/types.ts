export type PersonId = "levi" | "birgit" | "heidi";

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type TaskItem = {
  id: string;
  label: string;
  done: boolean;
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

export type BusStop = {
  name: string;
  departures: BusDeparture[];
};

export type WeatherSettings = {
  summary: string;
  temperatureC: number;
  clothingTip: string;
};

export type PersonalSettings = {
  preferredCoffee?: string;
  notes?: string;
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
  version: 2;
  persons: PersonProfile[];
  coffeeDrinks: CoffeeDrink[];
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
  departure: string;
  stopName: string;
  minutesUntil: number;
};

export type CalendarEvent = {
  time: string;
  title: string;
};

export type WeatherInfo = WeatherSettings;

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
