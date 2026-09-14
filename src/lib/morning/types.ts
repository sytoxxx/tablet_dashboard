import type {
  BusInfo,
  CalendarEvent,
  CoffeeDrinkId,
  PersonId,
  TaskItem,
  WeatherInfo,
  WorkShift,
} from "@/lib/types";
import type { DayFlowKind } from "@/lib/day/schedule-flow";

/** Status for the “Als Nächstes” hero. */
export type NextActivityStatus =
  | "current"
  | "upcoming"
  | "done"
  | "empty";

export type NextActivity = {
  status: NextActivityStatus;
  /** Absolute schedule status used by existing DayFlowHero when mapped. */
  flowKind: DayFlowKind;
  title: string | null;
  time: string | null;
  place: string | null;
  /** läuft gerade / in X Min. / um HH:MM / erledigt / Heute nichts geplant */
  relativeLabel: string;
  message: string;
  kind: "lesson" | "shift" | "block" | "appointment" | "none";
};

export type BusMorningStatus = "on_time" | "too_late" | "none" | "disabled" | "unknown";

export type BusMorning = {
  enabled: boolean;
  bus: BusInfo | null;
  status: BusMorningStatus;
  /** Short German line for the dashboard. */
  message: string;
  matchedToActivity: boolean;
};

export type WeatherMorning = {
  weather: WeatherInfo | null;
  /** Short tip only — never a long forecast paragraph. */
  tip: string | null;
};

export type CoffeeMorning = {
  enabled: boolean;
  preferredDrinkId: CoffeeDrinkId | null;
  preferredDrinkLabel: string | null;
  /** Idle morning copy, e.g. “Dein Kaffee ist bereit.” */
  message: string;
};

export type MorningVisibility = {
  nextActivity: boolean;
  itemsToTake: boolean;
  /** true when there is something useful to show (bus configured + enabled). */
  bus: boolean;
  weather: boolean;
  appointments: boolean;
  importantTasks: boolean;
  coffee: boolean;
  workShift: boolean;
};

/**
 * Structured morning overview — UI only renders; Jarvis can reuse later.
 */
export type MorningOverview = {
  personId: PersonId;
  displayName: string;
  greeting: string;
  focusIsoDate: string;
  focusIsTomorrow: boolean;
  nextActivity: NextActivity;
  itemsToTake: string[];
  /** Soft empty copy when itemsToTake is empty. */
  itemsToTakeEmptyMessage: string;
  bus: BusMorning;
  weather: WeatherMorning;
  /** Relevant (usually upcoming) appointments for the focus day. */
  appointments: CalendarEvent[];
  importantTasks: TaskItem[];
  coffee: CoffeeMorning;
  workShift: WorkShift | null;
  /** Spoken/text briefing for later Jarvis — not voice UI yet. */
  summary: string;
  visibility: MorningVisibility;
  /** Person-specific section order for dashboards. */
  priorityOrder: MorningSectionKey[];
};

export type MorningSectionKey =
  | "clock"
  | "nextActivity"
  | "work"
  | "itemsToTake"
  | "bus"
  | "weather"
  | "appointments"
  | "importantTasks"
  | "coffee"
  | "hint";
