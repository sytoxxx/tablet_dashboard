/**
 * Digital wardrobe item model (Phase 18).
 * Extends Phase-17 foundation — unknown attributes stay null/unknown.
 */
import type { PersonId } from "@/lib/types";
import type {
  WardrobeBrightness,
  WardrobeColor,
  WardrobeComfort,
  WardrobeGarmentKind,
  WardrobeSlot,
  WardrobeStyle,
  WardrobeWarmth,
} from "@/lib/wardrobe/taxonomy";
import { slotForGarmentKind } from "@/lib/wardrobe/taxonomy";

export type WardrobeItem = {
  id: string;
  personId: PersonId;
  /** Coarse slot for outfit assembly. */
  slot: WardrobeSlot;
  /** Fine garment kind. */
  garmentKind: WardrobeGarmentKind;
  name: string;
  color: WardrobeColor;
  brightness: WardrobeBrightness;
  style: WardrobeStyle;
  occasion: string[];
  warmth: WardrobeWarmth;
  rainSuitable: boolean | null;
  comfort: WardrobeComfort;
  brand: string | null;
  favorite: boolean;
  lastWornIso: string | null;
  wearCount: number;
  active: boolean;
  /** Optional tags for matching preference labels (e.g. "htl"). */
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type WardrobeCatalog = {
  personId: PersonId;
  items: WardrobeItem[];
  updatedAt: string;
};

/** Unsaved import proposal — never auto-persisted. */
export type WardrobeImportDraft = {
  personId: PersonId;
  /** Session-only preview; never logged. Discarded after save/cancel. */
  hasPhoto: boolean;
  garmentKind: WardrobeGarmentKind;
  name: string;
  color: WardrobeColor;
  brightness: WardrobeBrightness;
  style: WardrobeStyle;
  warmth: WardrobeWarmth;
  rainSuitable: boolean | null;
  comfort: WardrobeComfort;
  brand: string | null;
  favorite: boolean;
  tags: string[];
  /** How fields were produced. */
  source: "manual" | "suggestion";
  /** True when a vision provider produced the draft (still needs confirm). */
  fromVision: boolean;
};

export type WardrobeAnalyzeResult =
  | {
      ok: true;
      draft: Omit<WardrobeImportDraft, "personId" | "hasPhoto">;
      /** Human note — never includes image bytes. */
      note: string;
    }
  | {
      ok: false;
      reason: "unavailable" | "unsupported";
      note: string;
    };

export function emptyImportDraft(
  personId: PersonId,
  hasPhoto = false,
): WardrobeImportDraft {
  return {
    personId,
    hasPhoto,
    garmentKind: "other",
    name: "",
    color: "unknown",
    brightness: "unknown",
    style: "unknown",
    warmth: "unknown",
    rainSuitable: null,
    comfort: "unknown",
    brand: null,
    favorite: false,
    tags: [],
    source: "manual",
    fromVision: false,
  };
}

export function draftToItem(
  draft: WardrobeImportDraft,
  id: string,
  nowIso: string,
): WardrobeItem {
  return {
    id,
    personId: draft.personId,
    slot: slotForGarmentKind(draft.garmentKind),
    garmentKind: draft.garmentKind,
    name: draft.name.trim() || WARDROBE_GARMENT_FALLBACK_NAME(draft.garmentKind),
    color: draft.color,
    brightness: draft.brightness,
    style: draft.style,
    occasion: [],
    warmth: draft.warmth,
    rainSuitable: draft.rainSuitable,
    comfort: draft.comfort,
    brand: draft.brand?.trim() || null,
    favorite: draft.favorite,
    lastWornIso: null,
    wearCount: 0,
    active: true,
    tags: draft.tags,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

function WARDROBE_GARMENT_FALLBACK_NAME(kind: WardrobeGarmentKind): string {
  const labels: Record<WardrobeGarmentKind, string> = {
    "t-shirt": "T-Shirt",
    "button-t-shirt": "Button-T-Shirt",
    polo: "Polo",
    shirt: "Hemd",
    sweater: "Pullover",
    hoodie: "Hoodie",
    jacket: "Jacke",
    pants: "Hose",
    jeans: "Jeans",
    joggers: "Jogginghose",
    shorts: "Shorts",
    shoes: "Schuhe",
    other: "Kleidungsstück",
  };
  return labels[kind];
}

/** Future perfume catalog — architecture only in Phase 18. */
export type PerfumeItem = {
  id: string;
  personId: PersonId;
  name: string;
  scentType: string | null;
  strength: "light" | "medium" | "strong" | null;
  occasions: string[];
  weatherFit: string[];
  favorite: boolean;
  lastUsedIso: string | null;
};

export type PerfumeCatalog = {
  personId: PersonId;
  items: PerfumeItem[];
};
