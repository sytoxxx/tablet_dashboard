/**
 * Personal outfit preferences — stored rules (not scattered hardcoding).
 * Levi’s workshop kit is a preference record used by the rule engine.
 */
import type { PersonId } from "@/lib/types";
import type {
  PersonOutfitPreferences,
  PresentationOutfitPreference,
  WorkshopOutfitPreference,
} from "@/lib/outfit/types";

const LEVI_WORKSHOP: WorkshopOutfitPreference = {
  enabled: true,
  top: {
    label: "Rotes HTL-T-Shirt",
    slot: "top",
    category: "workshop-top",
    fromPreferenceOrWardrobe: true,
  },
  bottom: {
    label: "Bequeme Jogginghose",
    slot: "bottom",
    category: "joggers",
    fromPreferenceOrWardrobe: true,
  },
  shoes: {
    label: "Entspannte/bequeme Schuhe",
    slot: "shoes",
    category: "comfortable",
    fromPreferenceOrWardrobe: true,
  },
  changeAtSchool: true,
  note: "Werkstättenkleidung erst in der HTL anziehen — zu Hause nur vorbereiten.",
};

const LEVI_PRESENTATION: PresentationOutfitPreference = {
  enabled: true,
  topCategory: "button-t-shirt",
  styleHint:
    "Schönes T-Shirt mit Knopfleiste / Button-T-Shirt / Poloshirt-ähnlich — gepflegt, aber kein Hemd",
  allowFormalShirt: false,
};

function emptyRotation(
  personId: PersonId,
): PersonOutfitPreferences["rotation"] {
  return {
    personId,
    history: [],
    preferredStyles: [],
    preferredColors: [],
    dislikedItemIds: [],
    favoriteItemIds: [],
    minDaysBetweenSameOutfit: 1,
  };
}

export function defaultOutfitPreferences(
  personId: PersonId,
): PersonOutfitPreferences {
  if (personId === "levi") {
    return {
      personId,
      workshop: LEVI_WORKSHOP,
      presentation: LEVI_PRESENTATION,
      rotation: {
        ...emptyRotation("levi"),
        preferredStyles: ["casual", "smart-casual"],
        preferredColors: ["navy", "grey", "white", "red"],
      },
      perfume: { enabled: true, fragranceIds: [] },
      preferredStyles: ["casual", "smart-casual"],
      preferredColors: ["navy", "grey", "white"],
    };
  }

  return {
    personId,
    workshop: null,
    presentation: null,
    rotation: emptyRotation(personId),
    perfume: { enabled: true, fragranceIds: [] },
    preferredStyles: ["work", "comfortable"],
    preferredColors: [],
  };
}
