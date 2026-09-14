/**
 * Priority outfit rule engine.
 * 1 mandatory day → 2 occasion → 3 weather → 4 preferences → 5 rotation
 */
import { defaultOutfitPreferences } from "@/lib/outfit/preferences";
import { rankWardrobeItemsForRotation } from "@/lib/outfit/rotation";
import { buildWeatherOutfitFactors } from "@/lib/outfit/weather-factors";
import type {
  DayOutfitSignals,
  OutfitRecommendation,
  PersonOutfitPreferences,
  WardrobeCatalog,
  WeatherOutfitFactors,
} from "@/lib/outfit/types";
import type { PersonId, WeatherInfo } from "@/lib/types";

const WARDROBE_SETUP =
  "Outfit-Empfehlung verfügbar, sobald dein Kleiderschrank eingerichtet ist.";

const PERFUME_SETUP = "Parfum noch nicht eingerichtet.";

const SHOES_SETUP = "noch nicht verfügbar";

export function perfumePlaceholderDetail(
  prefs: PersonOutfitPreferences,
): string {
  if (prefs.perfume.fragranceIds.length === 0) return PERFUME_SETUP;
  return "Empfehlung aus deinen Düften";
}

export function shoesPlaceholderDetail(
  recommendation: OutfitRecommendation,
  wardrobeReady: boolean,
): string {
  if (recommendation.ruleKind === "mandatory_day") {
    const shoe = recommendation.pieces.find((p) => p.slot === "shoes");
    if (shoe) return shoe.label;
  }
  if (!wardrobeReady) return SHOES_SETUP;
  if (recommendation.shoeCategory) {
    return `Kategorie: ${recommendation.shoeCategory}`;
  }
  return "Passend zum Outfit";
}

export function resolveOutfitRecommendation(input: {
  personId: PersonId;
  dateIso: string;
  signals: DayOutfitSignals;
  weather?: WeatherInfo | null;
  wardrobe?: WardrobeCatalog | null;
  preferences?: PersonOutfitPreferences | null;
}): {
  recommendation: OutfitRecommendation;
  weatherFactors: WeatherOutfitFactors;
  preferences: PersonOutfitPreferences;
} {
  const preferences =
    input.preferences ?? defaultOutfitPreferences(input.personId);
  const weatherFactors = buildWeatherOutfitFactors(input.weather);
  const wardrobeReady = Boolean(
    input.wardrobe && input.wardrobe.items.length > 0,
  );
  const signals = input.signals;

  // 1) Mandatory day clothing — workshop
  if (signals.workshopDay && preferences.workshop?.enabled) {
    const ws = preferences.workshop;
    return {
      preferences,
      weatherFactors,
      recommendation: {
        ruleKind: "mandatory_day",
        priority: 1,
        headline: "Werkstatttag",
        topCategory: "workshop-top",
        bottomCategory: "joggers",
        shoeCategory: "comfortable",
        pieces: [ws.top, ws.bottom, ws.shoes],
        wardrobeRequired: false,
        detail: [ws.top.label, ws.bottom.label, ws.shoes.label].join(" · "),
        notes: [
          ws.note,
          ...(weatherFactors.guidance.length
            ? [`Wetter: ${weatherFactors.guidance[0]}`]
            : []),
        ],
        blocksNormalOutfit: true,
      },
    };
  }

  // 2) Special occasion — presentation / Referat
  if (signals.presentation && preferences.presentation?.enabled) {
    const pr = preferences.presentation;
    return {
      preferences,
      weatherFactors,
      recommendation: {
        ruleKind: "occasion",
        priority: 2,
        headline: "Referat / Präsentation",
        topCategory: pr.topCategory,
        bottomCategory: null,
        shoeCategory: null,
        pieces: [],
        wardrobeRequired: !wardrobeReady,
        detail: wardrobeReady
          ? pr.styleHint
          : `${pr.styleHint}. ${WARDROBE_SETUP}`,
        notes: [
          pr.styleHint,
          ...(pr.allowFormalShirt
            ? []
            : ["Kein klassisches Hemd — gepflegt-casual."]),
          ...weatherFactors.guidance.slice(0, 1),
        ],
        blocksNormalOutfit: true,
      },
    };
  }

  // 3–5) Weather + preferences + rotation — need wardrobe for concrete picks
  if (!wardrobeReady) {
    const weatherNote =
      weatherFactors.guidance.length > 0
        ? `Wetter berücksichtigen: ${weatherFactors.guidance.join(" · ")}`
        : null;
    return {
      preferences,
      weatherFactors,
      recommendation: {
        ruleKind: weatherFactors.guidance.length ? "weather" : "preference",
        priority: weatherFactors.guidance.length ? 3 : 4,
        headline: signals.schoolDay
          ? "Normaler Schultag"
          : signals.workDay
            ? "Arbeitstag"
            : "Alltag",
        topCategory: null,
        bottomCategory: null,
        shoeCategory: weatherFactors.rain ? "rain" : null,
        pieces: [],
        wardrobeRequired: true,
        detail: weatherNote
          ? `${WARDROBE_SETUP} (${weatherNote})`
          : WARDROBE_SETUP,
        notes: weatherFactors.guidance,
        blocksNormalOutfit: false,
      },
    };
  }

  const rankedTops = rankWardrobeItemsForRotation({
    catalog: input.wardrobe,
    rotation: preferences.rotation,
    onDateIso: input.dateIso,
    category: "top",
  });
  const rankedBottoms = rankWardrobeItemsForRotation({
    catalog: input.wardrobe,
    rotation: preferences.rotation,
    onDateIso: input.dateIso,
    category: "bottom",
  });
  const rankedShoes = rankWardrobeItemsForRotation({
    catalog: input.wardrobe,
    rotation: preferences.rotation,
    onDateIso: input.dateIso,
    category: "shoes",
  });

  const pieces = [rankedTops[0], rankedBottoms[0], rankedShoes[0]]
    .filter(Boolean)
    .map((item) => ({
      label: item!.label,
      slot: (item!.category === "shoes"
        ? "shoes"
        : item!.category === "bottom"
          ? "bottom"
          : "top") as "top" | "bottom" | "shoes",
      category: item!.category,
      fromPreferenceOrWardrobe: true,
    }));

  return {
    preferences,
    weatherFactors,
    recommendation: {
      ruleKind: "rotation",
      priority: 5,
      headline: "Outfit-Rotation",
      topCategory: null,
      bottomCategory: null,
      shoeCategory: null,
      pieces,
      wardrobeRequired: false,
      detail:
        pieces.length > 0
          ? pieces.map((p) => p.label).join(" · ")
          : WARDROBE_SETUP,
      notes: weatherFactors.guidance,
      blocksNormalOutfit: false,
    },
  };
}
