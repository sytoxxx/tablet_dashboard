/**
 * Evening prep — “Für morgen vorbereiten” from shared day + travel + outfit rules.
 * Never invents wardrobe / perfume / shoes unless stored as preferences.
 * Phase 18: optional digital wardrobe drives real outfit picks.
 */
import { addDays, toIsoDate } from "@/lib/day/tomorrow";
import { DAY_CONFIG } from "@/lib/day/config";
import { buildDayIntelligence } from "@/lib/day/intelligence";
import { getWeekdayKey } from "@/lib/format";
import {
  buildEveningChecklist,
  isEveningPrepComplete,
  type EveningChecklistItem,
  type EveningChecklistKey,
} from "@/lib/evening/checklist";
import { detectDayOutfitSignals } from "@/lib/outfit/day-signals";
import {
  perfumePlaceholderDetail,
  resolveOutfitRecommendation,
  shoesPlaceholderDetail,
} from "@/lib/outfit/engine";
import type {
  DayOutfitSignals,
  OutfitRecommendation,
  PersonOutfitPreferences,
  WardrobeCatalog,
  WeatherOutfitFactors,
} from "@/lib/outfit/types";
import type { PersonId, PersonProfile, WeatherInfo } from "@/lib/types";
import {
  planTravelForPerson,
  type TravelPlan,
} from "@/lib/work/travel-planner";
import type { WardrobeCatalog as DigitalWardrobeCatalog } from "@/lib/wardrobe/model";
import {
  pickOutfitForDay,
  perfumeStatus,
  type PickedOutfit,
} from "@/lib/wardrobe/pick";
import { pickedOutfitToRecommendation } from "@/lib/wardrobe/to-recommendation";

export type EveningPrepItemKind =
  | "context"
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
  detail: string;
  items?: string[];
};

export type EveningDayContext = {
  kind: "school" | "work" | "personal" | "off";
  label: string;
  timeRange: string | null;
};

export type EveningPrep = {
  personId: PersonId;
  date: string;
  title: string;
  banner: string | null;
  dayContext: EveningDayContext;
  items: EveningPrepItem[];
  wardrobeReady: boolean;
  leaveHome: string | null;
  destinationLabel: string | null;
  outfit: OutfitRecommendation;
  /** Phase-18 pick from digital wardrobe; null when not supplied. */
  pickedOutfit: PickedOutfit | null;
  weatherFactors: WeatherOutfitFactors;
  signals: DayOutfitSignals;
  checklist: EveningChecklistItem[];
  checklistComplete: boolean;
};

export type { WardrobeCatalog, WardrobeItem } from "@/lib/outfit/types";

export type BuildEveningPrepInput = {
  person: PersonProfile;
  now: Date;
  weather?: WeatherInfo | null;
  travelPlan?: TravelPlan | null;
  /** Phase-17 engine catalog (legacy). */
  wardrobe?: WardrobeCatalog | null;
  /** Phase-18 digital wardrobe — when set (even empty), drives outfit picks. */
  digitalWardrobe?: DigitalWardrobeCatalog | null;
  preferences?: PersonOutfitPreferences | null;
  dayHints?: string[] | null;
  checklistChecked?: Partial<Record<EveningChecklistKey, boolean>> | null;
  /** Exclude previous combination when user asks for another outfit. */
  excludeCombinationKey?: string | null;
};

/** Same threshold as tomorrow-focus evening mode. */
export function isEveningPrepContext(now: Date = new Date()): boolean {
  return now.getHours() >= DAY_CONFIG.eveningTomorrowHour;
}

function resolveDayContext(
  person: PersonProfile,
  tomorrow: Date,
  signals: DayOutfitSignals,
): EveningDayContext {
  const key = getWeekdayKey(tomorrow);
  if (person.schedule.type === "school" && signals.schoolDay) {
    const lessons = person.schedule.week[key]?.lessons ?? [];
    const start = lessons[0]?.time ?? null;
    const end = lessons[lessons.length - 1]?.time ?? null;
    return {
      kind: "school",
      label: signals.workshopDay ? "Werkstatt · HTL" : "Schule · HTL",
      timeRange: start && end ? `${start}–${end}` : start,
    };
  }
  if (person.schedule.type === "work" && signals.workDay) {
    const day = person.schedule.week[key]!;
    return {
      kind: "work",
      label: day.label,
      timeRange: `${day.start}–${day.end}`,
    };
  }
  if (person.schedule.type === "personal") {
    const blocks = person.schedule.week[key]?.blocks ?? [];
    if (blocks.length > 0) {
      return {
        kind: "personal",
        label: blocks[0].title,
        timeRange: blocks[0].time,
      };
    }
  }
  return { kind: "off", label: "Kein fester Plan", timeRange: null };
}

export function buildEveningPrep(input: BuildEveningPrepInput): EveningPrep {
  const tomorrow = addDays(input.now, 1);
  tomorrow.setHours(12, 0, 0, 0);
  const date = toIsoDate(tomorrow);

  const dayView = buildDayIntelligence(input.person, input.now);
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

  const useDigital = input.digitalWardrobe !== undefined;
  const digital = input.digitalWardrobe ?? null;
  const wardrobeReady = useDigital
    ? Boolean(digital && digital.items.some((i) => i.active))
    : Boolean(input.wardrobe && input.wardrobe.items.length > 0);

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
  const temperatureC =
    input.weather?.temperatureC ?? dayView.weather?.temperatureC ?? null;

  const signals = detectDayOutfitSignals({
    person: input.person,
    date: tomorrow,
    extraHints: input.dayHints,
  });

  let recommendation: OutfitRecommendation;
  let weatherFactors: WeatherOutfitFactors;
  let preferences: PersonOutfitPreferences;
  let pickedOutfit: PickedOutfit | null = null;

  if (useDigital) {
    pickedOutfit = pickOutfitForDay({
      personId: input.person.id,
      dateIso: date,
      signals,
      wardrobe: digital,
      weather: input.weather ?? dayView.weather,
      preferences: input.preferences,
      excludeCombinationKey: input.excludeCombinationKey,
    });
    recommendation = pickedOutfitToRecommendation(pickedOutfit);
    const resolved = resolveOutfitRecommendation({
      personId: input.person.id,
      dateIso: date,
      signals,
      weather: input.weather ?? dayView.weather,
      preferences: input.preferences,
    });
    weatherFactors = resolved.weatherFactors;
    preferences = resolved.preferences;
  } else {
    const resolved = resolveOutfitRecommendation({
      personId: input.person.id,
      dateIso: date,
      signals,
      weather: input.weather ?? dayView.weather,
      wardrobe: input.wardrobe,
      preferences: input.preferences,
    });
    recommendation = resolved.recommendation;
    weatherFactors = resolved.weatherFactors;
    preferences = resolved.preferences;
  }

  const dayContext = resolveDayContext(input.person, tomorrow, signals);

  const banner = signals.presentation
    ? signals.presentationLabel
      ? `🎤 ${signals.presentationLabel}`
      : "🎤 Referat / Präsentation"
    : signals.workshopDay
      ? "🔧 Werkstatttag"
      : null;

  const weatherDetailParts: string[] = [];
  if (typeof temperatureC === "number") {
    weatherDetailParts.push(`${temperatureC}°C`);
  }
  if (weatherFactors.rain) weatherDetailParts.push("Regen");
  else if (weatherSummary) weatherDetailParts.push(weatherSummary);
  if (weatherTip) {
    weatherDetailParts.push(
      weatherTip.replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim() || weatherTip,
    );
  }

  const outfitReady =
    !recommendation.wardrobeRequired &&
    (recommendation.pieces.length > 0 ||
      recommendation.ruleKind === "occasion" ||
      recommendation.ruleKind === "mandatory_day");

  const items: EveningPrepItem[] = [
    {
      kind: "context",
      label:
        dayContext.kind === "school"
          ? "Schule"
          : dayContext.kind === "work"
            ? "Arbeit"
            : "Tag",
      status: dayContext.kind === "off" ? "empty" : "ready",
      detail: dayContext.timeRange
        ? `${dayContext.label} · ${dayContext.timeRange}`
        : dayContext.label,
    },
    {
      kind: "outfit",
      label: "Outfit",
      status: outfitReady ? "ready" : "unavailable",
      detail: recommendation.detail,
      items: pickedOutfit
        ? pickedOutfit.pieces.map((p) => {
            const emoji =
              p.slot === "top"
                ? "👕"
                : p.slot === "bottom"
                  ? "👖"
                  : p.slot === "shoes"
                    ? "👟"
                    : "🧥";
            if (p.item) return `${emoji} ${p.item.name}`;
            return p.missingPrompt ?? `${emoji} ${p.label}`;
          })
        : recommendation.pieces.map((p) => p.label),
    },
    {
      kind: "shoes",
      label: "Schuhe",
      status:
        recommendation.ruleKind === "mandatory_day" ||
        Boolean(pickedOutfit?.pieces.find((p) => p.slot === "shoes")?.item)
          ? "ready"
          : wardrobeReady
            ? "ready"
            : "unavailable",
      detail: (() => {
        if (pickedOutfit) {
          const shoes = pickedOutfit.pieces.find((p) => p.slot === "shoes");
          if (shoes?.item) return shoes.item.name;
          if (shoes?.missingPrompt) return shoes.missingPrompt;
        }
        return shoesPlaceholderDetail(recommendation, wardrobeReady);
      })(),
    },
    {
      kind: "perfume",
      label: "Parfum",
      status:
        preferences.perfume.fragranceIds.length > 0 ? "ready" : "unavailable",
      detail: useDigital
        ? perfumeStatus(true)
        : perfumePlaceholderDetail(preferences),
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
      status: weatherDetailParts.length > 0 ? "ready" : "empty",
      detail:
        weatherDetailParts.length > 0
          ? weatherDetailParts.join(" · ")
          : "Noch kein Wetterhinweis",
    },
    {
      kind: "morning",
      label: "Morgen losgehen",
      status:
        travel.leaveHome && travel.status === "on-time" ? "ready" : "empty",
      detail: travel.leaveHome
        ? travel.leaveHome
        : travel.mode === "bus" && travel.status === "no-connection"
          ? "Noch keine passende Verbindung"
          : "Losgehzeit folgt aus dem Plan",
    },
  ];

  const checklist = buildEveningChecklist({
    personId: input.person.id,
    dateIso: date,
    checked: input.checklistChecked,
    includePerfume: preferences.perfume.enabled,
  });

  return {
    personId: input.person.id,
    date,
    title: "Für morgen vorbereiten",
    banner,
    dayContext,
    items,
    wardrobeReady,
    leaveHome: travel.leaveHome,
    destinationLabel: travel.destinationLabel,
    outfit: recommendation,
    pickedOutfit,
    weatherFactors,
    signals,
    checklist,
    checklistComplete: isEveningPrepComplete(checklist),
  };
}
