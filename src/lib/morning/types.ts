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
import type { TravelPlan } from "@/lib/work/travel-planner";
import type { MorningTimeline } from "@/lib/morning/timeline";
import type { EveningPrep } from "@/lib/evening/prep";

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

/**
 * Primary bus dashboard status for the morning engine.
 * Arrival-fit (on_time/too_late) is separate from vehicle delay/cancel.
 */
export type BusMorningStatus =
  | "on_time"
  | "too_late"
  | "delayed"
  | "cancelled"
  | "none"
  | "disabled"
  | "unknown";

/** Where the displayed departure time comes from. */
export type BusTimingSource =
  | "realtime"
  | "schedule"
  | "test"
  | "cache"
  | "none";

export type BusMorning = {
  enabled: boolean;
  bus: BusInfo | null;
  status: BusMorningStatus;
  /** Short German line for the dashboard. */
  message: string;
  matchedToActivity: boolean;
  timingSource: BusTimingSource;
  delayMinutes: number | null;
  cancelled: boolean;
  isTestData: boolean;
  displayDeparture: string | null;
  /** Levi/Admin note: Echtzeit / Nach Fahrplan / Testdaten — never jargon on Birgit. */
  scheduleNote: string | null;
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
  /** Soft important hint for Heidi (and Birgit optional). */
  hint: boolean;
  /** Walking / bus leave-time plan (Levi school walk or work bus). */
  travelPlan: boolean;
  /** Dynamic morning timeline. */
  timeline: boolean;
  /** Evening prep block (evening hours / tomorrow focus). */
  eveningPrep: boolean;
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
  /**
   * Shared leave-time plan (walking or bus).
   * Levi: walking to HTL. Birgit/Heidi: bus to work when provided via live.
   */
  travelPlan: TravelPlan | null;
  /** Dynamic morning timeline derived from travel + clock. */
  timeline: MorningTimeline | null;
  /** Evening prep for tomorrow — foundation (no invented wardrobe). */
  eveningPrep: EveningPrep | null;
  /** Optional short hint line (person.hint or Heidi important task). */
  importantHint: string | null;
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
  | "travel"
  | "timeline"
  | "eveningPrep"
  | "weather"
  | "appointments"
  | "importantTasks"
  | "coffee"
  | "hint";
