import type { PersonId } from "@/lib/types";

export type JarvisIntent =
  | "day_overview"
  | "morning_brief"
  | "next_activity"
  | "bring"
  | "leave_time"
  | "bus"
  | "weather"
  | "important"
  | "unknown"
  | "empty";

/**
 * Voice-ready request shape:
 * mic → STT → question text → askJarvis → answer → TTS
 */
export type JarvisAskInput = {
  personId: PersonId;
  question: string;
  /** Wall clock for overview focus / daypart. */
  now?: Date;
};

export type JarvisFacts = {
  personId: PersonId;
  displayName: string;
  greeting: string;
  summary: string;
  nextActivity: {
    status: string;
    title: string | null;
    time: string | null;
    relativeLabel: string;
    message: string;
  };
  itemsToTake: string[];
  itemsToTakeEmptyMessage: string;
  bus: {
    enabled: boolean;
    status: string;
    message: string;
    departure: string | null;
    scheduledDeparture: string | null;
    realtimeDeparture: string | null;
    delayMinutes: number | null;
    cancelled: boolean;
    isTestData: boolean;
    timingSource: string;
    arrivesInTime: boolean | null;
  };
  weather: {
    temperatureC: number | null;
    summary: string | null;
    clothingTip: string | null;
  };
  appointments: Array<{ time: string; title: string }>;
  importantTasks: string[];
  workShift: {
    label: string;
    start: string;
    end: string;
    location: string;
  } | null;
  importantHint: string | null;
};

export type JarvisResponse = {
  personId: PersonId;
  question: string;
  intent: JarvisIntent;
  /** Natural-language answer for UI / future TTS. */
  answer: string;
  /** Deterministic draft before optional AI polish. */
  deterministicAnswer: string;
  source: "deterministic" | "ai";
  /** Structured facts only — never invented by the model. */
  facts: JarvisFacts;
  /** ISO timestamp of the answer. */
  answeredAt: string;
};
