export type PersonId = "levi" | "birgit" | "heidi";

export type PersonKind = "school" | "work" | "personal";

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
  minutesUntil: number;
};

export type WeatherInfo = {
  summary: string;
  temperatureC: number;
  clothingTip: string;
};

export type CalendarEvent = {
  time: string;
  title: string;
};

export type TaskItem = {
  id: string;
  label: string;
  done: boolean;
};

/** Shared morning context — shaped for a later data-provider swap. */
export type PersonDay = {
  id: PersonId;
  kind: PersonKind;
  displayName: string;
  shortName: string;
  hint: string;
  greeting: string;
  accent: string;
  timetable: TimetableEntry[];
  workShift: WorkShift | null;
  mitnehmen: string[];
  nextBus: BusInfo | null;
  weather: WeatherInfo | null;
  calendar: CalendarEvent[];
  tasks: TaskItem[];
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
