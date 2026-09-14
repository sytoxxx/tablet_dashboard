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

/**
 * Short spoken-style briefing for later Jarvis — structured string only.
 * No voice / speech synthesis yet.
 */
export function buildMorningSummary(input: {
  displayName: string;
  greeting: string;
  nextActivity: NextActivity;
  itemsToTake: string[];
  bus: BusMorning;
  weather: WeatherInfo | null;
}): string {
  const parts: string[] = [];

  parts.push(`${input.greeting}.`);

  if (input.nextActivity.status === "empty") {
    parts.push("Heute ist nichts Festes geplant.");
  } else if (input.nextActivity.status === "done") {
    parts.push("Dein Plan für heute ist erledigt.");
  } else if (input.nextActivity.status === "current" && input.nextActivity.title) {
    parts.push(`Gerade läuft: ${input.nextActivity.title}.`);
  } else if (input.nextActivity.title && input.nextActivity.time) {
    parts.push(
      `Du hast um ${input.nextActivity.time} ${input.nextActivity.title}.`,
    );
  }

  if (input.itemsToTake.length > 0) {
    const list =
      input.itemsToTake.length === 1
        ? input.itemsToTake[0]
        : `${input.itemsToTake.slice(0, -1).join(", ")} und ${input.itemsToTake[input.itemsToTake.length - 1]}`;
    parts.push(`Du brauchst ${list}.`);
  } else {
    parts.push(EMPTY_BRING_MESSAGE + ".");
  }

  if (input.bus.enabled && input.bus.bus) {
    parts.push(
      `Der nächste passende Bus fährt um ${input.bus.bus.departure}.`,
    );
    if (input.bus.status === "on_time") {
      parts.push("Du kommst rechtzeitig an.");
    } else if (input.bus.status === "too_late") {
      parts.push("Der Bus reicht möglicherweise nicht.");
    }
  } else if (input.bus.enabled && input.bus.status === "none") {
    parts.push("Kein passender Bus gefunden.");
  }

  if (input.weather) {
    const tip = input.weather.clothingTip
      ? ` ${stripEmoji(input.weather.clothingTip)}.`
      : "";
    parts.push(
      `Es sind ${input.weather.temperatureC} Grad${
        input.weather.summary ? ` und ${input.weather.summary.toLowerCase()}` : ""
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

/** Ensure summary helpers stay in sync with overview shape. */
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
  return buildMorningSummary({
    displayName: overview.displayName,
    greeting: overview.greeting,
    nextActivity: overview.nextActivity,
    itemsToTake: overview.itemsToTake,
    bus: overview.bus,
    weather: overview.weather.weather,
  });
}
