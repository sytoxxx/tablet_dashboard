export type PersonId = "levi" | "schwiegermutter" | "heidi";

export type TimetableEntry = {
  time: string;
  subject: string;
  room: string;
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

export type PersonDay = {
  id: PersonId;
  displayName: string;
  shortName: string;
  greeting: string;
  accent: string;
  timetable: TimetableEntry[];
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
  timerSeconds: number;
  personalSettings: string;
};
