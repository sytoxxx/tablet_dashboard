/**
 * Presentation-only day-assistant priority for morning glance.
 * Uses existing overview/shift/travel data — invents nothing.
 */
import type { CalendarEvent, WorkShift } from "@/lib/types";

export type WorkMorningPriority = {
  isWorking: boolean;
  isFree: boolean;
  nextAppointment: CalendarEvent | null;
  nothingImportantCopy: string;
  freeDayCopy: string;
};

export type NextUpGlance = {
  /** Primary line under ALS NÄCHSTES */
  title: string;
  detail?: string | null;
};

export function resolveWorkMorningPriority(input: {
  workShift: WorkShift | null | undefined;
  appointments: CalendarEvent[] | null | undefined;
  /** Evening / tomorrow focus — soften free copy. */
  focusIsTomorrow?: boolean;
}): WorkMorningPriority {
  const isWorking = Boolean(input.workShift);
  const nextAppointment = input.appointments?.[0] ?? null;
  return {
    isWorking,
    isFree: !isWorking,
    nextAppointment,
    nothingImportantCopy: "Heute steht nichts Wichtiges an.",
    freeDayCopy: input.focusIsTomorrow
      ? "Du hast morgen frei. 🌿"
      : "Du hast heute frei. 🌿",
  };
}

/**
 * Compact “Als Nächstes” from real signals only — never invents actions.
 */
export function resolveNextUpGlance(input: {
  isWorking: boolean;
  isFree: boolean;
  focusIsTomorrow?: boolean;
  leaveHome?: string | null;
  workStart?: string | null;
  appointment?: CalendarEvent | null;
  coffeeReady?: boolean;
  coffeeMessage?: string | null;
}): NextUpGlance {
  if (input.leaveHome?.trim()) {
    return {
      title: `Los um ${input.leaveHome.trim()}`,
      detail: input.focusIsTomorrow ? "Morgen losfahren" : "Losfahren",
    };
  }
  if (input.isWorking && input.workStart?.trim()) {
    return {
      title: `Arbeit ab ${input.workStart.trim()}`,
      detail: input.focusIsTomorrow ? "Morgen" : "Heute",
    };
  }
  if (input.appointment?.time && input.appointment.title) {
    return {
      title: input.appointment.title,
      detail: `um ${input.appointment.time}`,
    };
  }
  if (input.coffeeReady && input.coffeeMessage?.trim()) {
    return {
      title: input.coffeeMessage.trim(),
      detail: "Kaffee",
    };
  }
  if (input.isFree) {
    return {
      title: input.focusIsTomorrow
        ? "Morgen ist nichts Dringendes."
        : "Heute ist nichts Dringendes.",
      detail: null,
    };
  }
  return {
    title: "Heute ist nichts Dringendes.",
    detail: null,
  };
}
