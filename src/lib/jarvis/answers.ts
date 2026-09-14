import type { MorningOverview } from "@/lib/morning/types";
import type { JarvisFacts, JarvisIntent } from "@/lib/jarvis/types";
import { EMPTY_BRING_MESSAGE } from "@/lib/day/bring";

/** Project overview → facts bag for answers / AI phrasing (no invention). */
export function factsFromOverview(overview: MorningOverview): JarvisFacts {
  const bus = overview.bus;
  return {
    personId: overview.personId,
    displayName: overview.displayName,
    greeting: overview.greeting,
    summary: overview.summary,
    nextActivity: {
      status: overview.nextActivity.status,
      title: overview.nextActivity.title,
      time: overview.nextActivity.time,
      relativeLabel: overview.nextActivity.relativeLabel,
      message: overview.nextActivity.message,
    },
    itemsToTake: overview.itemsToTake,
    itemsToTakeEmptyMessage:
      overview.itemsToTakeEmptyMessage || EMPTY_BRING_MESSAGE,
    bus: {
      enabled: bus.enabled,
      status: bus.status,
      message: bus.message,
      departure: bus.displayDeparture ?? bus.bus?.departure ?? null,
      scheduledDeparture: bus.bus?.scheduledDeparture ?? null,
      realtimeDeparture: bus.bus?.realtimeDeparture ?? null,
      delayMinutes: bus.delayMinutes,
      cancelled: bus.cancelled,
      isTestData: bus.isTestData,
      timingSource: bus.timingSource,
      arrivesInTime: bus.bus?.arrivesInTime ?? null,
    },
    weather: {
      temperatureC: overview.weather.weather?.temperatureC ?? null,
      summary: overview.weather.weather?.summary ?? null,
      clothingTip:
        overview.weather.tip ?? overview.weather.weather?.clothingTip ?? null,
    },
    appointments: overview.appointments.map((a) => ({
      time: a.time,
      title: a.title,
    })),
    importantTasks: overview.importantTasks.map((t) => t.label),
    workShift: overview.workShift
      ? {
          label: overview.workShift.label,
          start: overview.workShift.start,
          end: overview.workShift.end,
          location: overview.workShift.location,
        }
      : null,
    importantHint: overview.importantHint,
  };
}

/**
 * Deterministic German answers — only from Morning Overview facts.
 * Never invents bus/weather/calendar data.
 */
export function buildDeterministicAnswer(
  intent: JarvisIntent,
  facts: JarvisFacts,
): string {
  switch (intent) {
    case "empty":
      return "Stelle mir eine Frage zu deinem Tag — zum Beispiel zum Bus, Wetter oder Mitnehmen.";
    case "unknown":
      return "Dazu habe ich aktuell keine Daten. Frag mich zu Tag, Mitnehmen, Bus, Wetter oder Wichtigem.";
    case "morning_brief":
    case "day_overview":
      return answerDay(facts);
    case "next_activity":
      return answerNext(facts);
    case "bring":
      return answerBring(facts);
    case "leave_time":
    case "bus":
      return answerBus(facts, intent === "leave_time");
    case "weather":
      return answerWeather(facts);
    case "important":
      return answerImportant(facts);
    default:
      return "Dazu habe ich aktuell keine Daten.";
  }
}

function answerDay(facts: JarvisFacts): string {
  const parts: string[] = [`${facts.greeting}.`];

  if (facts.workShift) {
    parts.push(
      `Deine Arbeit: ${facts.workShift.label} von ${facts.workShift.start} bis ${facts.workShift.end}.`,
    );
  } else if (facts.nextActivity.status === "empty") {
    parts.push("Heute ist nichts Festes geplant.");
  } else if (facts.nextActivity.status === "done") {
    parts.push("Dein Plan für heute ist erledigt.");
  } else if (facts.nextActivity.title && facts.nextActivity.time) {
    if (facts.nextActivity.status === "current") {
      parts.push(`Gerade läuft: ${facts.nextActivity.title}.`);
    } else {
      parts.push(
        `Um ${facts.nextActivity.time} hast du ${facts.nextActivity.title}.`,
      );
    }
  }

  if (facts.itemsToTake.length > 0 && facts.personId === "levi") {
    parts.push(`Du brauchst ${listItems(facts.itemsToTake)}.`);
  }

  return join(parts);
}

function answerNext(facts: JarvisFacts): string {
  if (facts.nextActivity.status === "empty") {
    return "Heute nichts geplant.";
  }
  if (facts.nextActivity.status === "done") {
    return "Für heute ist dein Plan erledigt.";
  }
  if (facts.nextActivity.status === "current" && facts.nextActivity.title) {
    return `Gerade läuft: ${facts.nextActivity.title}${
      facts.nextActivity.time ? ` (seit ${facts.nextActivity.time})` : ""
    }.`;
  }
  if (facts.nextActivity.title && facts.nextActivity.time) {
    return `Als Nächstes: ${facts.nextActivity.title} um ${facts.nextActivity.time}.`;
  }
  return "Dazu habe ich aktuell keine Daten.";
}

function answerBring(facts: JarvisFacts): string {
  if (facts.itemsToTake.length === 0) {
    return facts.itemsToTakeEmptyMessage || EMPTY_BRING_MESSAGE;
  }
  return `Du brauchst ${listItems(facts.itemsToTake)}.`;
}

function answerBus(facts: JarvisFacts, leaveFocus: boolean): string {
  if (!facts.bus.enabled || facts.bus.status === "disabled") {
    return "Heute brauchst du keinen Bus.";
  }
  if (facts.bus.status === "none" || !facts.bus.departure) {
    return "Kein passender Bus gefunden.";
  }

  if (facts.bus.cancelled) {
    return facts.bus.departure
      ? `Der Bus um ${facts.bus.scheduledDeparture || facts.bus.departure} fällt aus. Dazu habe ich aktuell keine weitere passende Verbindung.`
      : "Der Bus fällt aus. Dazu habe ich aktuell keine weitere passende Verbindung.";
  }

  const departure =
    facts.bus.realtimeDeparture ||
    facts.bus.departure ||
    facts.bus.scheduledDeparture;
  if (!departure) return "Dazu habe ich aktuell keine Busdaten.";

  const parts: string[] = [];

  if (
    facts.bus.delayMinutes != null &&
    facts.bus.delayMinutes > 0 &&
    facts.bus.realtimeDeparture
  ) {
    parts.push(
      `Dein Bus fährt voraussichtlich um ${facts.bus.realtimeDeparture}. Er hat ${facts.bus.delayMinutes} Minuten Verspätung.`,
    );
    if (facts.bus.scheduledDeparture) {
      parts.push(`Planmäßig wäre er um ${facts.bus.scheduledDeparture}.`);
    }
  } else if (leaveFocus) {
    parts.push(`Du solltest zum Bus um ${departure} los.`);
  } else {
    parts.push(`Dein nächster passender Bus fährt um ${departure}.`);
  }

  if (facts.bus.status === "too_late") {
    parts.push("Mit diesem Bus kommst du möglicherweise zu spät.");
  } else if (facts.bus.status === "on_time") {
    parts.push("Du kommst rechtzeitig an.");
  }

  if (facts.bus.isTestData || facts.bus.timingSource === "test") {
    parts.push("Aktuell sind das Testdaten.");
  } else if (facts.bus.timingSource === "schedule") {
    parts.push("Die Angabe basiert auf dem Fahrplan.");
  } else if (facts.bus.timingSource === "cache") {
    parts.push("Das sind zuletzt gespeicherte Daten — keine aktuelle Live-Abfahrt.");
  }

  return join(parts);
}

function answerWeather(facts: JarvisFacts): string {
  if (facts.weather.temperatureC === null) {
    return "Dazu habe ich aktuell keine Wetterdaten.";
  }
  const parts = [
    `Es sind ${facts.weather.temperatureC} Grad${
      facts.weather.summary ? ` — ${facts.weather.summary}` : ""
    }.`,
  ];
  if (facts.weather.clothingTip) {
    parts.push(stripEmoji(facts.weather.clothingTip));
  }
  return join(parts);
}

function answerImportant(facts: JarvisFacts): string {
  if (facts.importantTasks.length > 0) {
    return `Wichtig heute: ${listItems(facts.importantTasks)}.`;
  }
  if (facts.importantHint) {
    return facts.importantHint;
  }
  return "Heute nichts Wichtiges markiert.";
}

function listItems(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} und ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

function join(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
