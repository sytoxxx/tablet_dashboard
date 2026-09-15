import type { CoffeeDrinkId, PersonId, WeatherInfo } from "@/lib/types";
import type {
  BusMorning,
  CoffeeMorning,
  MorningOverview,
  NextActivity,
} from "@/lib/morning/types";
import { EMPTY_BRING_MESSAGE } from "@/lib/day/bring";

const COFFEE_LABELS: Record<CoffeeDrinkId, string> = {
  espresso: "Espresso",
  cappuccino: "Cappuccino",
  latte: "Latte",
};

export function resolveCoffeeMorning(input: {
  preferredCoffee?: string | null;
  /** Birgit/Heidi keep coffee off the morning strip by default. */
  personId: PersonId;
}): CoffeeMorning {
  const raw = input.preferredCoffee?.trim().toLowerCase() ?? "";
  const id = (["espresso", "cappuccino", "latte"] as CoffeeDrinkId[]).find(
    (x) => x === raw,
  );
  const enabled = input.personId === "levi" && Boolean(id || raw);

  if (!enabled) {
    return {
      enabled: false,
      preferredDrinkId: null,
      preferredDrinkLabel: null,
      message: "",
    };
  }

  const preferredDrinkId = id ?? null;
  const preferredDrinkLabel = id
    ? COFFEE_LABELS[id]
    : input.preferredCoffee?.trim() || null;

  return {
    enabled: true,
    preferredDrinkId,
    preferredDrinkLabel,
    message: "Dein Kaffee ist bereit.",
  };
}

type SummaryFields = {
  displayName: string;
  greeting: string;
  nextActivity: NextActivity;
  itemsToTake: string[];
  bus: BusMorning;
  weather: WeatherInfo | null;
};

function toSummaryFields(
  input:
    | SummaryFields
    | Pick<
        MorningOverview,
        | "displayName"
        | "greeting"
        | "nextActivity"
        | "itemsToTake"
        | "bus"
        | "weather"
      >,
): SummaryFields {
  const weatherRaw = input.weather;
  const weather: WeatherInfo | null =
    weatherRaw && typeof weatherRaw === "object" && "tip" in weatherRaw
      ? (weatherRaw as MorningOverview["weather"]).weather
      : ((weatherRaw as WeatherInfo | null) ?? null);

  return {
    displayName: input.displayName,
    greeting: input.greeting,
    nextActivity: input.nextActivity,
    itemsToTake: input.itemsToTake,
    bus: input.bus,
    weather,
  };
}

/**
 * Short spoken-style briefing for later Jarvis — structured string only.
 * Prefer `buildMorningSummary(overview)`.
 * No voice / speech synthesis yet.
 */
export function buildMorningSummary(
  input:
    | SummaryFields
    | Pick<
        MorningOverview,
        | "displayName"
        | "greeting"
        | "nextActivity"
        | "itemsToTake"
        | "bus"
        | "weather"
      >,
): string {
  const fields = toSummaryFields(input);
  const parts: string[] = [];

  parts.push(`${fields.greeting}.`);

  if (fields.nextActivity.status === "empty") {
    parts.push("Heute ist nichts Festes geplant.");
  } else if (fields.nextActivity.status === "done") {
    parts.push("Dein Plan für heute ist erledigt.");
  } else if (
    fields.nextActivity.status === "current" &&
    fields.nextActivity.title
  ) {
    parts.push(`Gerade läuft: ${fields.nextActivity.title}.`);
  } else if (fields.nextActivity.title && fields.nextActivity.time) {
    parts.push(
      `Du hast um ${fields.nextActivity.time} ${fields.nextActivity.title}.`,
    );
  }

  if (fields.itemsToTake.length > 0) {
    const list =
      fields.itemsToTake.length === 1
        ? fields.itemsToTake[0]
        : `${fields.itemsToTake.slice(0, -1).join(", ")} und ${fields.itemsToTake[fields.itemsToTake.length - 1]}`;
    parts.push(`Du brauchst ${list}.`);
  } else {
    parts.push(EMPTY_BRING_MESSAGE + ".");
  }

  if (fields.bus.enabled && fields.bus.bus && !fields.bus.cancelled) {
    parts.push(
      `Der nächste passende Bus fährt um ${fields.bus.displayDeparture ?? fields.bus.bus.departure}.`,
    );
    if (fields.bus.status === "delayed" && fields.bus.delayMinutes) {
      parts.push(`Es gibt etwa ${fields.bus.delayMinutes} Minuten Verspätung.`);
    }
    if (fields.bus.status === "on_time") {
      parts.push("Du kommst rechtzeitig an.");
    } else if (fields.bus.status === "too_late") {
      parts.push("Der Bus reicht möglicherweise nicht.");
    }
    if (fields.bus.timingSource === "schedule") {
      parts.push("Die Abfahrt basiert auf dem Fahrplan.");
    } else if (fields.bus.timingSource === "test") {
      parts.push("Busdaten sind Testdaten.");
    }
  } else if (fields.bus.enabled && fields.bus.status === "cancelled") {
    parts.push("Der Bus fällt aus.");
  } else if (fields.bus.enabled && fields.bus.status === "none") {
    parts.push("Kein passender Bus gefunden.");
  }

  if (fields.weather) {
    const tip = fields.weather.clothingTip
      ? ` ${stripEmoji(fields.weather.clothingTip)}.`
      : "";
    parts.push(
      `Es sind ${fields.weather.temperatureC} Grad${
        fields.weather.summary
          ? ` und ${fields.weather.summary.toLowerCase()}`
          : ""
      }.${tip}`,
    );
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compact weather tip line for overview (reuses clothingTip). */
export function weatherTipFrom(weather: WeatherInfo | null): string | null {
  if (!weather) return null;
  return weather.clothingTip || null;
}

/** @deprecated prefer buildMorningSummary(overview) */
export function summaryFromOverview(
  overview: Pick<
    MorningOverview,
    | "displayName"
    | "greeting"
    | "nextActivity"
    | "itemsToTake"
    | "bus"
    | "weather"
  >,
): string {
  return buildMorningSummary(overview);
}
