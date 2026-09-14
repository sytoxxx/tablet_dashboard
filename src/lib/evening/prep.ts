/**
 * Evening prep foundation — prepare for tomorrow without inventing wardrobe data.
 * Future wardrobe / outfit scanner plugs into WardrobeCatalog types only.
 */
import { addDays, toIsoDate } from "@/lib/day/tomorrow";
import { DAY_CONFIG } from "@/lib/day/config";
import type { PersonId, PersonProfile, WeatherInfo } from "@/lib/types";
import {
  planTravelForPerson,
  type TravelPlan,
} from "@/lib/work/travel-planner";
import { buildDayIntelligence } from "@/lib/day/intelligence";

export type EveningPrepItemKind =
  | "outfit"
  | "shoes"
  | "perfume"
  | "bag"
  | "weather"
  | "morning";

export type EveningPrepItemStatus = "ready" | "unavailable" | "empty";

export type EveningPrepItem = {
  kind: EveningPrepItemKind;
  label: string;
  status: EveningPrepItemStatus;
  /** Short German detail — never invent clothing. */
  detail: string;
  items?: string[];
};

export type EveningPrep = {
  personId: PersonId;
  /** Tomorrow (focus day) ISO date. */
  date: string;
  title: string;
  items: EveningPrepItem[];
  /** False until a wardrobe catalog exists — Phase 15 always false from data. */
  wardrobeReady: boolean;
  leaveHome: string | null;
  destinationLabel: string | null;
};

/**
 * Future wardrobe model — architecture only, no scanner in Phase 15.
 * Do not invent instances in production flows.
 */
export type WardrobeItemCategory =
  | "top"
  | "bottom"
  | "shoes"
  | "outerwear"
  | "accessory"
  | "perfume"
  | "other";

export type WardrobeItem = {
  id: string;
  category: WardrobeItemCategory;
  label: string;
  color?: string;
  brightness?: "light" | "dark" | "neutral";
  material?: string;
  brand?: string;
  warmth?: "cool" | "mild" | "warm";
  rainOk?: boolean;
  style?: string;
  occasion?: string[];
  favorite?: boolean;
  lastWornIso?: string | null;
  available?: boolean;
};

export type WardrobeCatalog = {
  personId: PersonId;
  items: WardrobeItem[];
  updatedAt?: string;
};

export type BuildEveningPrepInput = {
  person: PersonProfile;
  now: Date;
  /** Live/local weather for the focus (tomorrow) glance when available. */
  weather?: WeatherInfo | null;
  /** Optional bus-based travel plan for tomorrow morning (Birgit/Heidi). */
  travelPlan?: TravelPlan | null;
  /** Future: real catalog. Omit / empty → unavailable outfit slots. */
  wardrobe?: WardrobeCatalog | null;
};

const OUTFIT_PLACEHOLDER =
  "Outfit-Empfehlungen kommen, sobald dein Kleiderschrank eingerichtet ist.";

/**
 * True when the dashboard should emphasize evening prep (same threshold as tomorrow focus).
 */
export function isEveningPrepContext(now: Date = new Date()): boolean {
  return now.getHours() >= DAY_CONFIG.eveningTomorrowHour;
}

/**
 * Build “Für morgen vorbereiten” from tomorrow’s bring list, weather tip, and travel plan.
 * Never invents clothing / perfume / shoes recommendations.
 */
export function buildEveningPrep(input: BuildEveningPrepInput): EveningPrep {
  const tomorrow = addDays(input.now, 1);
  tomorrow.setHours(12, 0, 0, 0);
  const date = toIsoDate(tomorrow);

  const dayView = buildDayIntelligence(input.person, input.now);
  // When already in evening focus, dayView is tomorrow; otherwise force tomorrow glance
  const bagItems = dayView.focusIsTomorrow
    ? dayView.mitnehmen
    : buildDayIntelligence(
        input.person,
        new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          7,
          0,
          0,
          0,
        ),
      ).mitnehmen;

  const wardrobeReady = Boolean(
    input.wardrobe && input.wardrobe.items.length > 0,
  );

  const travel =
    input.travelPlan &&
    input.travelPlan.applicable &&
    input.travelPlan.status === "on-time"
      ? input.travelPlan
      : planTravelForPerson(input.person, tomorrow);

  const weatherTip =
    input.weather?.clothingTip?.trim() ||
    dayView.weather?.clothingTip?.trim() ||
    null;
  const weatherSummary = input.weather?.summary || dayView.weather?.summary;

  const items: EveningPrepItem[] = [
    {
      kind: "outfit",
      label: "Outfit",
      status: wardrobeReady ? "ready" : "unavailable",
      detail: wardrobeReady
        ? "Aus deinem Kleiderschrank"
        : OUTFIT_PLACEHOLDER,
    },
    {
      kind: "shoes",
      label: "Schuhe",
      status: wardrobeReady ? "ready" : "unavailable",
      detail: wardrobeReady
        ? "Passend zum Outfit"
        : "noch nicht verfügbar",
    },
    {
      kind: "perfume",
      label: "Parfum",
      status: wardrobeReady ? "ready" : "unavailable",
      detail: wardrobeReady ? "Empfehlung aus deinen Düften" : "noch nicht verfügbar",
    },
    {
      kind: "bag",
      label: "Tasche",
      status: bagItems.length > 0 ? "ready" : "empty",
      detail:
        bagItems.length > 0
          ? bagItems.slice(0, 6).join(" · ")
          : "Nichts Besonderes einpacken",
      items: bagItems,
    },
    {
      kind: "weather",
      label: "Wetter",
      status: weatherTip || weatherSummary ? "ready" : "empty",
      detail: weatherTip
        ? weatherTip.replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim() ||
          weatherTip
        : weatherSummary
          ? weatherSummary
          : "Noch kein Wetterhinweis",
    },
    {
      kind: "morning",
      label: "Morgen",
      status:
        travel.leaveHome && travel.status === "on-time" ? "ready" : "empty",
      detail: travel.leaveHome
        ? `${travel.leaveHome} losgehen`
        : travel.mode === "bus" && travel.status === "no-connection"
          ? "Noch keine passende Verbindung"
          : "Losgehzeit folgt aus dem Plan",
    },
  ];

  return {
    personId: input.person.id,
    date,
    title: "Für morgen vorbereiten",
    items,
    wardrobeReady,
    leaveHome: travel.leaveHome,
    destinationLabel: travel.destinationLabel,
  };
}
