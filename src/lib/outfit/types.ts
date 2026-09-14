/**
 * Outfit rule engine + wardrobe foundation (Phase 17).
 * No scanner. No invented wardrobe instances in production flows.
 */
import type { PersonId } from "@/lib/types";

/** Priority: 1 = highest. */
export type OutfitRulePriority = 1 | 2 | 3 | 4 | 5;

export type OutfitRuleKind =
  | "mandatory_day"
  | "occasion"
  | "weather"
  | "preference"
  | "rotation";

export type OutfitTopCategory =
  | "t-shirt"
  | "button-t-shirt"
  | "polo"
  | "hoodie"
  | "shirt"
  | "workshop-top"
  | "other";

export type OutfitBottomCategory =
  | "jeans"
  | "joggers"
  | "chinos"
  | "shorts"
  | "other";

export type ShoeCategory =
  | "sneakers"
  | "comfortable"
  | "rain"
  | "formal"
  | "workshop"
  | "other";

/** Concrete piece only from stored preference or wardrobe — never invented. */
export type OutfitPieceSuggestion = {
  label: string;
  slot: "top" | "bottom" | "shoes" | "outerwear" | "accessory";
  category?: string;
  fromPreferenceOrWardrobe: boolean;
};

export type OutfitRecommendation = {
  ruleKind: OutfitRuleKind;
  priority: OutfitRulePriority;
  headline: string;
  topCategory: OutfitTopCategory | null;
  bottomCategory: OutfitBottomCategory | null;
  shoeCategory: ShoeCategory | null;
  pieces: OutfitPieceSuggestion[];
  wardrobeRequired: boolean;
  detail: string;
  notes: string[];
  blocksNormalOutfit: boolean;
};

export type WeatherOutfitFactors = {
  morningTempC: number | null;
  daytimeTempC: number | null;
  rain: boolean;
  windy: boolean;
  warning: string | null;
  guidance: string[];
};

export type WearHistoryEntry = {
  dateIso: string;
  outfitId?: string;
  itemIds: string[];
  styleTags: string[];
  colors: string[];
};

export type OutfitRotationState = {
  personId: PersonId;
  history: WearHistoryEntry[];
  preferredStyles: string[];
  preferredColors: string[];
  dislikedItemIds: string[];
  favoriteItemIds: string[];
  minDaysBetweenSameOutfit: number;
};

export type WorkshopOutfitPreference = {
  enabled: boolean;
  top: OutfitPieceSuggestion;
  bottom: OutfitPieceSuggestion;
  shoes: OutfitPieceSuggestion;
  changeAtSchool: boolean;
  note: string;
};

export type PresentationOutfitPreference = {
  enabled: boolean;
  topCategory: OutfitTopCategory;
  styleHint: string;
  allowFormalShirt: boolean;
};

export type PerfumePreferences = {
  enabled: boolean;
  fragranceIds: string[];
};

export type PersonOutfitPreferences = {
  personId: PersonId;
  workshop: WorkshopOutfitPreference | null;
  presentation: PresentationOutfitPreference | null;
  rotation: OutfitRotationState;
  perfume: PerfumePreferences;
  preferredStyles: string[];
  preferredColors: string[];
};

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
  brand?: string;
  material?: string;
  warmth?: "cool" | "mild" | "warm";
  rainOk?: boolean;
  style?: string;
  occasion?: string[];
  size?: string;
  favorite?: boolean;
  lastWornIso?: string | null;
  wearCount?: number;
  available?: boolean;
};

export type WardrobeCatalog = {
  personId: PersonId;
  items: WardrobeItem[];
  updatedAt?: string;
};

export type DayOutfitSignals = {
  workshopDay: boolean;
  presentation: boolean;
  presentationLabel: string | null;
  schoolDay: boolean;
  workDay: boolean;
  lessonSubjects: string[];
  appointmentTitles: string[];
};
