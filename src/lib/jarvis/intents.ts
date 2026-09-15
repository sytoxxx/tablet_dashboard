import type { JarvisIntent } from "@/lib/jarvis/types";

/**
 * Map free-text German morning questions to intents.
 * Conservative: unknown → unknown (no invented domain answers).
 */
export function classifyJarvisIntent(question: string): JarvisIntent {
  const q = normalize(question);
  if (!q) return "empty";

  if (
    /was\s+muss\s+ich\s+mitnehmen|mitnehmen|schultasche|was\s+brauch\s+ich|packen/.test(
      q,
    )
  ) {
    return "bring";
  }

  if (
    /wann\s+muss\s+ich\s+los|wann\s+los|abfahrt\s+zeit|wann\s+fahren|wann\s+gehen/.test(
      q,
    )
  ) {
    return "leave_time";
  }

  if (
    /welcher\s+bus|n(ä|a)chste(r)?\s+bus|bus\s+kommt|mein\s+bus|verbindung/.test(
      q,
    )
  ) {
    return "bus";
  }

  if (/wetter|regnet|temperatur|jacke|grad/.test(q)) {
    return "weather";
  }

  if (
    /als\s+n(ä|a)chstes|was\s+habe\s+ich\s+als\s+n|n(ä|a)chste(r)?\s+termin|n(ä|a)chste\s+stunde|was\s+kommt\s+als\s+n/.test(
      q,
    )
  ) {
    return "next_activity";
  }

  if (
    /was\s+ist\s+heute\s+wichtig|wichtige?\s+(aufgabe|termin|ding)|to-?dos?|aufgaben/.test(
      q,
    )
  ) {
    return "important";
  }

  if (
    /wie\s+sieht\s+mein\s+morgen|mein\s+morgen|morgen\s+aus|briefing|zusammenfassung/.test(
      q,
    )
  ) {
    return "morning_brief";
  }

  if (
    /was\s+steht\s+heute|was\s+habe\s+ich\s+heute|mein\s+tag|heute\s+an|tagesplan|was\s+steht\s+an/.test(
      q,
    )
  ) {
    return "day_overview";
  }

  return "unknown";
}

function normalize(question: string): string {
  return question
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[?!.,;:]+/g, " ")
    .replace(/\s+/g, " ");
}

export const JARVIS_SUGGESTIONS = [
  "Was steht heute an?",
  "Was muss ich mitnehmen?",
  "Wann muss ich los?",
  "Welcher Bus kommt als nächstes?",
  "Wie wird das Wetter?",
  "Was habe ich als Nächstes?",
  "Was ist heute wichtig?",
  "Wie sieht mein Morgen aus?",
] as const;
